"use client";

import { Target, Users, Wine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { EVENT_NAME } from "@/constants/event";
import { sceneMeta } from "@/constants/scenes";
import { SiteNav } from "@/components/site-nav";
import { ACCENT, type BoardView } from "@/app/projection/board-parts";
import { BoardStage } from "@/app/projection/stages";
import type { ProjectionSnapshot, TileState } from "@/domain/projection";
import type { ProjectionEvent } from "@/domain/types";
import { cn } from "@/lib/utils";

type Tiles = Record<string, TileState>;
type Stats = ProjectionSnapshot["stats"];
const EMPTY_STATS: Stats = { checkedIn: 0, missionsCompleted: 0, drinksActive: 0 };

function formatScene(scene: string): string {
  return scene.replace(/_/g, " ");
}

export default function ProjectionPage() {
  const [tiles, setTiles] = useState<Tiles>({});
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [scene, setScene] = useState("arrival");
  const [puzzle, setPuzzle] = useState<{ id: string; imageUrl: string | null } | null>(null);
  const [eventPhone, setEventPhone] = useState("");
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  // `?scene=` forces a stage on this screen only (preview / fixed side display); it never
  // touches the broadcast scene or writes anything.
  const [previewScene, setPreviewScene] = useState<string | null>(null);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("scene");
    if (forced) setPreviewScene(forced);
  }, []);

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
      setEventPhone(snap.eventPhone);
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

  const activeCount = ordered.filter((t) => !t.eliminated).length;
  const activeScene = previewScene ?? scene;
  const meta = sceneMeta(activeScene);
  const view: BoardView = {
    ordered,
    stats,
    sceneMeta: meta,
    puzzleImage: puzzle?.imageUrl && puzzle.imageUrl !== "" ? puzzle.imageUrl : null,
    flash,
    eventPhone,
    topScore: ordered[0]?.score ?? 0,
    activeCount,
    fadedCount: ordered.length - activeCount,
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-nyx px-10 py-8 scanlines">
      <header className="relative z-[2] border-b border-nyx-line pb-4">
        <SiteNav
          actions={
            <div className="flex flex-wrap items-end gap-8">
              <Stat label="checked in" value={stats.checkedIn} Icon={Users} />
              <Stat label="missions solved" value={stats.missionsCompleted} Icon={Target} accent="helio" />
              <Stat label="drinks pouring" value={stats.drinksActive} Icon={Wine} accent="topaz" />
              <span
                className={cn(
                  "mb-1.5 h-2.5 w-2.5 rounded-full",
                  connected ? "bg-gem-peridot animate-pulse-slow" : "bg-gem-garnet",
                )}
                title={connected ? "live" : "reconnecting"}
              />
            </div>
          }
        />
        <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-ash">
          {EVENT_NAME} · scene ·{" "}
          <span className={ACCENT[meta.accent].text}>{formatScene(activeScene)}</span>
          {previewScene ? <span className="ml-2 text-ash/70">(preview)</span> : null}
        </p>
      </header>

      <BoardStage scene={activeScene} view={view} />
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
