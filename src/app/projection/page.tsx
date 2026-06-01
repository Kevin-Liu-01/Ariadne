"use client";

import { Crown, Hourglass, Target, Users, Wine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { PRODUCT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { GemIcon } from "@/components/gem-icon";
import type { ProjectionSnapshot, TileState } from "@/domain/projection";
import type { ProjectionEvent } from "@/domain/types";
import { cn } from "@/lib/utils";

type Tiles = Record<string, TileState>;
type Stats = ProjectionSnapshot["stats"];
const EMPTY_STATS: Stats = { checkedIn: 0, missionsCompleted: 0, drinksActive: 0 };

function initials(tile: TileState): string {
  if (tile.displayName) {
    return tile.displayName
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);
  }
  return tile.gameId.slice(0, 2);
}

export default function ProjectionPage() {
  const [tiles, setTiles] = useState<Tiles>({});
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [scene, setScene] = useState("arrival");
  const [puzzle, setPuzzle] = useState<{ id: string; imageUrl: string | null } | null>(null);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let lastSeq = 0;

    const rebuild = (snap: ProjectionSnapshot) => {
      const next: Tiles = {};
      for (const t of snap.participants) next[t.gameId] = t;
      setTiles(next);
      setStats(snap.stats);
      setScene(snap.scene);
      setPuzzle(snap.puzzle);
      lastSeq = snap.latestSeq;
    };

    const apply = (ev: ProjectionEvent) => {
      const d = ev.data as Record<string, string | number | undefined>;
      const gameId = typeof d.gameId === "string" ? d.gameId : null;
      if (ev.type === "scene.changed" && typeof d.scene === "string") setScene(d.scene);
      if (ev.type === "puzzle.changed" && typeof d.puzzleId === "string") {
        setPuzzle({ id: d.puzzleId, imageUrl: typeof d.imageUrl === "string" ? d.imageUrl : null });
      }
      if (ev.type === "participant.checked_in" && gameId) {
        setTiles((prev) => ({
          ...prev,
          [gameId]: {
            gameId,
            displayName: typeof d.displayName === "string" ? d.displayName : null,
            gem: (d.gem as TileState["gem"]) ?? "topaz",
            gemHex: typeof d.gemHex === "string" ? d.gemHex : "#FFAB57",
            score: 0,
            eliminated: false,
            rank: 0,
          },
        }));
        setStats((s) => ({ ...s, checkedIn: s.checkedIn + 1 }));
      }
      if (ev.type === "score.updated" && gameId && typeof d.score === "number") {
        setTiles((prev) =>
          prev[gameId] ? { ...prev, [gameId]: { ...prev[gameId], score: d.score as number } } : prev,
        );
      }
      if (ev.type === "mission.completed" && gameId) {
        setStats((s) => ({ ...s, missionsCompleted: s.missionsCompleted + 1 }));
        setFlash((f) => ({ ...f, [gameId]: Date.now() }));
        setTimeout(() => setFlash((f) => ({ ...f, [gameId]: 0 })), 2200);
      }
      if ((ev.type === "participant.eliminated" || ev.type === "participant.restored") && gameId) {
        const eliminated = ev.type === "participant.eliminated";
        setTiles((prev) =>
          prev[gameId] ? { ...prev, [gameId]: { ...prev[gameId], eliminated } } : prev,
        );
      }
    };

    // Load the authoritative snapshot, then poll for incremental events. Postgres
    // is the source of truth, so a dropped poll heals on the next tick. A periodic
    // full reload corrects any drift from optimistic incremental updates.
    const loadState = async () => {
      try {
        const snap = (await (await fetch("/api/projection/state")).json()) as ProjectionSnapshot;
        if (cancelled) return;
        rebuild(snap);
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };

    const poll = async () => {
      try {
        const res = await fetch(`/api/projection/events?since=${lastSeq}`);
        const { events } = (await res.json()) as { events: ProjectionEvent[] };
        if (cancelled) return;
        setConnected(true);
        for (const ev of events) {
          apply(ev);
          if (ev.seq > lastSeq) lastSeq = ev.seq;
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    };

    void loadState();
    const pollTimer = setInterval(poll, 1500);
    const healTimer = setInterval(loadState, 15000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      clearInterval(healTimer);
    };
  }, []);

  const ordered = useMemo(
    () =>
      Object.values(tiles).sort((a, b) => b.score - a.score || a.gameId.localeCompare(b.gameId)),
    [tiles],
  );

  return (
    <main className="relative flex min-h-screen flex-col px-10 py-8 hud-grid scanlines">
      <header className="flex items-baseline justify-between border-b border-nyx-line pb-5">
        <div className="flex items-center gap-4">
          <LabyrinthThread size={48} />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{PRODUCT_NAME}</h1>
            <p className="text-xs uppercase tracking-[0.4em] text-ash">scene · {scene}</p>
          </div>
        </div>
        <div className="flex gap-8 text-right">
          <Stat label="checked in" value={stats.checkedIn} Icon={Users} />
          <Stat label="missions solved" value={stats.missionsCompleted} Icon={Target} />
          <Stat label="drinks pouring" value={stats.drinksActive} Icon={Wine} />
          <span
            className={cn(
              "self-center h-2 w-2 rounded-full",
              connected ? "bg-gem-peridot animate-pulse-slow" : "bg-gem-garnet",
            )}
            title={connected ? "live" : "reconnecting"}
          />
        </div>
      </header>

      {(scene === "missions" || scene === "puzzle") && puzzle?.imageUrl ? (
        <section className="mt-6 flex items-center gap-5 border border-helio/40 bg-nyx-soft/70 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- event asset, intentionally cropped + blurred */}
          <img
            src={puzzle.imageUrl}
            alt="decode this"
            className="h-28 w-28 shrink-0 rounded object-cover blur-[2px] contrast-125"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-helio">decode the labyrinth</p>
            <p className="mt-1 text-sm text-cloud">
              Text Ariadne what this is: name the myth, object, place, or source.
            </p>
          </div>
        </section>
      ) : null}

      {ordered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-ash">
          <Hourglass className="h-8 w-8 animate-pulse-slow" strokeWidth={1} aria-hidden />
          <p className="animate-pulse-slow text-sm uppercase tracking-[0.4em]">
            waiting for the first thread…
          </p>
        </div>
      ) : (
        <>
        <div className="mt-8 grid flex-1 content-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
          {ordered.map((tile, i) => (
            <div
              key={tile.gameId}
              className={cn(
                "reticle relative flex aspect-square flex-col items-center justify-center border border-nyx-line/70 bg-nyx-soft/80 p-2 transition-all duration-500",
                i < 3 && !tile.eliminated && "reticle-strong",
                tile.eliminated && "tile-eliminated",
                flash[tile.gameId] && "border-helio shadow-[0_0_28px_rgba(210,190,255,0.45)]",
              )}
            >
              {i < 3 && !tile.eliminated ? (
                <span className="absolute left-2 top-2 flex items-center gap-0.5 text-[10px] tabular-nums text-helio">
                  {i === 0 ? <Crown className="h-3 w-3" strokeWidth={1.5} aria-hidden /> : null}#
                  {i + 1}
                </span>
              ) : null}
              <GemIcon gem={tile.gem} size={28} />
              <p className="mt-2 truncate text-sm text-cloud">{tile.displayName ?? initials(tile)}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-ash">{tile.gameId}</p>
              <p className="mt-1 text-lg tabular-nums text-cloud">{tile.score}</p>
            </div>
          ))}
        </div>
        <footer className="mt-6 flex flex-wrap gap-x-6 gap-y-1 border-t border-nyx-line/60 pt-4 text-[10px] uppercase tracking-[0.18em] text-ash">
          <span>gem · your team color</span>
          <span>score · missions solved</span>
          <span># rank · leaderboard</span>
          <span>faded · guest removed from board</span>
        </footer>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, Icon }: { label: string; value: number; Icon: LucideIcon }) {
  return (
    <div>
      <p className="text-2xl tabular-nums text-cloud">{value}</p>
      <p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.2em] text-ash">
        <Icon className="h-3 w-3" strokeWidth={1.5} aria-hidden />
        {label}
      </p>
    </div>
  );
}
