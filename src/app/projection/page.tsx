"use client";

import { Crown, Hourglass, Target, Users, Wine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { EVENT_NAME, PRODUCT_NAME } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { SiteNav } from "@/components/site-nav";
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

function formatScene(scene: string): string {
  return scene.replace(/_/g, " ");
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

  const topScore = ordered[0]?.score ?? 0;
  const activeCount = ordered.filter((t) => !t.eliminated).length;
  const fadedCount = ordered.length - activeCount;

  const showPuzzle =
    (scene === "missions" || scene === "puzzle") && puzzle?.imageUrl != null && puzzle.imageUrl !== "";

  return (
    <main className="relative flex min-h-screen flex-col bg-nyx px-10 py-8 scanlines">
      <header className="relative z-[2] flex flex-col gap-4 border-b border-nyx-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <LabyrinthThread size={48} />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{PRODUCT_NAME}</h1>
              <p className="mt-0.5 text-xs uppercase tracking-[0.35em] text-ash">{EVENT_NAME}</p>
              <p className="mt-1 text-sm uppercase tracking-[0.25em] text-helio">
                scene · {formatScene(scene)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-8">
            <Stat label="checked in" value={stats.checkedIn} Icon={Users} />
            <Stat label="missions solved" value={stats.missionsCompleted} Icon={Target} accent="helio" />
            <Stat label="drinks pouring" value={stats.drinksActive} Icon={Wine} accent="topaz" />
            <span
              className={cn(
                "mb-2 h-2.5 w-2.5 rounded-full",
                connected ? "bg-gem-peridot animate-pulse-slow" : "bg-gem-garnet",
              )}
              title={connected ? "live" : "reconnecting"}
            />
          </div>
        </div>
        <SiteNav />
      </header>

      {showPuzzle ? (
        <section className="relative z-[2] mt-6 reticle reticle-strong flex items-center gap-6 border border-helio/40 bg-nyx-soft/80 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- event asset, intentionally cropped + blurred */}
          <img
            src={puzzle.imageUrl!}
            alt="decode this"
            className="h-36 w-36 shrink-0 object-cover blur-[2px] contrast-125"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-helio">decode the labyrinth</p>
            <p className="mt-2 text-lg text-cloud">
              Text Ariadne what this is: name the myth, object, place, or source.
            </p>
            <p className="mt-2 text-xs text-ash">Mission active · image puzzle on screen</p>
          </div>
        </section>
      ) : null}

      {ordered.length === 0 ? (
        <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-4 text-ash">
          <Hourglass className="h-8 w-8 animate-pulse-slow" strokeWidth={1} aria-hidden />
          <p className="animate-pulse-slow text-sm uppercase tracking-[0.4em]">
            waiting for the first thread…
          </p>
        </div>
      ) : (
        <div className="relative z-[2] mt-6 flex flex-1 flex-col gap-6 lg:flex-row lg:items-stretch">
          <aside className="reticle flex w-full shrink-0 flex-col border border-nyx-line/70 bg-nyx-soft/60 p-4 lg:w-80">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs uppercase tracking-[0.25em] text-helio">leaderboard</h2>
              <span className="text-xs tabular-nums text-ash">{ordered.length} players</span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-b border-nyx-line/60 pb-3 text-center">
              <RoomMetric label="active" value={activeCount} />
              <RoomMetric label="faded" value={fadedCount} />
              <RoomMetric label="top score" value={topScore} />
            </dl>
            <ol className="mt-3 flex-1 space-y-1.5 overflow-auto">
              {ordered.map((tile, i) => (
                <li
                  key={tile.gameId}
                  className={cn(
                    "flex items-center gap-2 border border-transparent px-2 py-1.5",
                    tile.eliminated && "opacity-40",
                    i < 3 && !tile.eliminated && "border-nyx-line/60 bg-nyx/50",
                  )}
                >
                  <span className="flex w-5 shrink-0 items-center justify-center text-[10px] tabular-nums text-ash">
                    {i === 0 && !tile.eliminated ? (
                      <Crown className="h-3 w-3 text-helio" strokeWidth={1.5} aria-hidden />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <GemIcon gem={tile.gem} size={16} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cloud">{tile.displayName ?? initials(tile)}</p>
                    <p className="truncate text-[10px] tracking-[0.12em] text-ash">{tile.gameId}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-sm text-cloud">{tile.score}</span>
                </li>
              ))}
            </ol>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="grid flex-1 content-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(148px,1fr))]">
              {ordered.map((tile, i) => (
                <PlayerTile key={tile.gameId} tile={tile} rank={i + 1} flash={!!flash[tile.gameId]} />
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="relative z-[2] mt-8 border-t border-nyx-line/60 pt-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LegendItem term="Gem" description="Your team color on the board" />
          <LegendItem term="Score" description="Missions solved tonight" />
          <LegendItem term="Rank" description="Leaderboard position (#1–#3 highlighted)" />
          <LegendItem term="Faded" description="Guest removed from the board" />
        </div>
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  Icon,
  accent = "cloud",
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  accent?: "cloud" | "helio" | "topaz";
}) {
  return (
    <div className="text-right">
      <p
        className={cn(
          "text-2xl tabular-nums",
          accent === "helio" && "text-helio",
          accent === "topaz" && "text-gem-topaz",
          accent === "cloud" && "text-cloud",
        )}
      >
        {value}
      </p>
      <p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.2em] text-ash">
        <Icon className="h-3 w-3" strokeWidth={1.5} aria-hidden />
        {label}
      </p>
    </div>
  );
}

function RoomMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-ash">{label}</dt>
      <dd className="mt-0.5 text-lg tabular-nums text-cloud">{value}</dd>
    </div>
  );
}

function LegendItem({ term, description }: { term: string; description: string }) {
  return (
    <div className="border-l border-nyx-line/80 pl-3">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-helio">{term}</p>
      <p className="mt-1 text-sm leading-snug text-ash">{description}</p>
    </div>
  );
}

function PlayerTile({ tile, rank, flash }: { tile: TileState; rank: number; flash: boolean }) {
  const gemLabel = GEMS[tile.gem].label;

  return (
    <div
      className={cn(
        "reticle relative flex aspect-square flex-col items-center justify-center border border-nyx-line/70 bg-nyx-soft/80 p-3 transition-all duration-500",
        rank <= 3 && !tile.eliminated && "reticle-strong",
        tile.eliminated && "tile-eliminated",
        flash && "border-helio shadow-[0_0_28px_rgba(210,190,255,0.45)]",
      )}
    >
      <span className="absolute left-2 top-2 flex items-center gap-0.5 text-[10px] tabular-nums text-ash">
        {rank === 1 && !tile.eliminated ? (
          <Crown className="h-3 w-3 text-helio" strokeWidth={1.5} aria-hidden />
        ) : null}
        #{rank}
      </span>
      <GemIcon gem={tile.gem} size={32} />
      <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-helio">{gemLabel}</p>
      <p className="mt-1 max-w-full truncate text-sm text-cloud">{tile.displayName ?? initials(tile)}</p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-ash">{tile.gameId}</p>
      <p className="mt-auto pt-2 text-xl tabular-nums text-cloud">{tile.score}</p>
    </div>
  );
}
