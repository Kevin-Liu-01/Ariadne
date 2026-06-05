"use client";

import { Megaphone, Target, Users, Wine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { EVENT_NAME } from "@/constants/event";
import { sceneMeta } from "@/constants/scenes";
import { GameLiveHeadline } from "@/components/game-live-headline";
import { RunwayWordmark } from "@/components/runway-wordmark";
import { ShaderBackdrop } from "@/components/shader-backdrop";
import type { BoardView } from "@/app/projection/board-parts";
import { BoardStage } from "@/app/projection/stages";
import type { ProjectionSnapshot, TileState } from "@/domain/projection";
import { projectionGameplayActive } from "@/domain/projection-gameplay";
import type { ProjectionEvent } from "@/domain/types";
import { cn } from "@/lib/utils";

type Tiles = Record<string, TileState>;
type Stats = ProjectionSnapshot["stats"];
const EMPTY_STATS: Stats = { checkedIn: 0, missionsCompleted: 0, drinksActive: 0 };

/**
 * Ambient shaders.com look per scene. Cinematic scenes (arrival/opening/runway) run
 * bold; the game/finale boards keep it faint so the live content stays readable.
 */
const SCENE_BACKDROP: Record<string, { scene: string; className: string }> = {
  arrival: { scene: "Soft Register", className: "opacity-[0.3]" },
  opening: { scene: "Fluid Chrome", className: "opacity-[0.24]" },
  game: { scene: "Soft Register", className: "opacity-[0.1]" },
  finale: { scene: "Spectral Bloom", className: "opacity-[0.16]" },
  runway: { scene: "Dedalus Bloom", className: "opacity-[0.28]" },
};

function vmForScene(participantIds: string[], activeScene: string): Record<string, boolean> {
  if (!projectionGameplayActive(activeScene)) return {};
  const vm: Record<string, boolean> = {};
  for (const id of participantIds) vm[id] = true;
  return vm;
}

export default function ProjectionPage() {
  const [tiles, setTiles] = useState<Tiles>({});
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [scene, setScene] = useState("arrival");
  const [eventPhone, setEventPhone] = useState("");
  const [flash, setFlash] = useState<Record<string, number>>({});
  const [ripple, setRipple] = useState<Record<string, number>>({});
  const [vmSpawn, setVmSpawn] = useState<Record<string, boolean>>({});
  const [announcement, setAnnouncement] = useState<string | null>(null);
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
    let sceneLive = "arrival";
    let announceTimer: ReturnType<typeof setTimeout> | null = null;

    const showAnnouncement = (body: string, ms = 18000) => {
      setAnnouncement(body);
      if (announceTimer) clearTimeout(announceTimer);
      announceTimer = setTimeout(() => setAnnouncement(null), ms);
    };

    const pulseFlash = (gameId: string, ms = 2200) => {
      setFlash((f) => ({ ...f, [gameId]: Date.now() }));
      setTimeout(() => setFlash((f) => ({ ...f, [gameId]: 0 })), ms);
    };

    const pulseRipple = (gameId: string, ms = 1400) => {
      setRipple((r) => ({ ...r, [gameId]: Date.now() }));
      setTimeout(() => setRipple((r) => ({ ...r, [gameId]: 0 })), ms);
    };

    const spawnAllVm = (ids: string[]) => {
      if (ids.length === 0) return;
      setVmSpawn((v) => {
        const next = { ...v };
        for (const id of ids) next[id] = true;
        return next;
      });
    };

    const rebuild = (snap: ProjectionSnapshot) => {
      const next: Tiles = {};
      for (const t of snap.participants) next[t.gameId] = t;
      setTiles(next);
      setStats(snap.stats);
      sceneLive = snap.scene;
      setScene(snap.scene);
      setEventPhone(snap.eventPhone);
      setVmSpawn(vmForScene(snap.participants.map((t) => t.gameId), snap.scene));
      lastSeq = snap.latestSeq;
    };

    const apply = (ev: ProjectionEvent) => {
      const d = ev.data as Record<string, string | number | undefined>;
      const gameId = typeof d.gameId === "string" ? d.gameId : null;
      if (ev.type === "scene.changed" && typeof d.scene === "string") {
        sceneLive = d.scene;
        setScene(d.scene);
        if (projectionGameplayActive(d.scene)) {
          setTiles((prev) => {
            spawnAllVm(Object.keys(prev));
            return prev;
          });
        }
      }
      if (ev.type === "announcement.posted" && typeof d.body === "string") {
        showAnnouncement(d.body);
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
            questsDone: 0,
            eliminated: false,
            rank: 0,
          },
        }));
        setStats((s) => ({ ...s, checkedIn: s.checkedIn + 1 }));
        if (projectionGameplayActive(sceneLive)) {
          setVmSpawn((v) => ({ ...v, [gameId]: true }));
        }
      }
      if (ev.type === "participant.messaged" && gameId) {
        pulseRipple(gameId);
      }
      if (ev.type === "score.updated" && gameId && typeof d.score === "number") {
        setTiles((prev) =>
          prev[gameId] ? { ...prev, [gameId]: { ...prev[gameId], score: d.score as number } } : prev,
        );
      }
      if (ev.type === "mission.completed" && gameId) {
        setStats((s) => ({ ...s, missionsCompleted: s.missionsCompleted + 1 }));
        setTiles((prev) =>
          prev[gameId]
            ? { ...prev, [gameId]: { ...prev[gameId], questsDone: prev[gameId].questsDone + 1 } }
            : prev,
        );
        pulseFlash(gameId);
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
      if (announceTimer) clearTimeout(announceTimer);
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
  const backdrop = SCENE_BACKDROP[activeScene] ?? SCENE_BACKDROP.game;
  const view: BoardView = {
    ordered,
    stats,
    sceneMeta: meta,
    flash,
    ripple,
    vmSpawn,
    eventPhone,
    topScore: ordered[0]?.score ?? 0,
    activeCount,
    fadedCount: ordered.length - activeCount,
  };

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-nyx px-10 py-8 scanlines">
      <ShaderBackdrop sceneName={backdrop.scene} className={backdrop.className} />
      {/* The projected board carries no nav chrome. Cinematic scenes paint full-bleed;
          only the live game keeps a thin stats bar up top. */}
      {activeScene === "game" ? (
        <header className="relative z-[2] flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b border-nyx-line pb-4">
          <div className="flex items-center gap-3">
            <RunwayWordmark size="xl" />
            <span
              className={cn(
                "mb-1 h-2.5 w-2.5 rounded-full",
                connected ? "bg-gem-peridot animate-pulse-slow" : "bg-gem-garnet",
              )}
              title={connected ? "live" : "reconnecting"}
            />
          </div>
          <div className="text-right">
            <GameLiveHeadline headline={meta.headline} />
            <div className="mt-3 flex items-end justify-end gap-8">
              <Stat label="checked in" value={stats.checkedIn} Icon={Users} />
              <Stat label="missions solved" value={stats.missionsCompleted} Icon={Target} accent="helio" />
              <Stat label="drinks pouring" value={stats.drinksActive} Icon={Wine} accent="topaz" />
            </div>
            {previewScene ? (
              <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-ash/60">preview</p>
            ) : null}
          </div>
        </header>
      ) : null}

      <BoardStage scene={activeScene} view={view} />

      {announcement ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex justify-center px-10 pb-10">
          <div className="animate-rise flex max-w-4xl items-center gap-4 border border-helio/50 bg-nyx-soft/95 px-7 py-5 shadow-[0_0_60px_rgba(210,190,255,0.25)]">
            <Megaphone className="h-7 w-7 shrink-0 text-helio" strokeWidth={1.5} aria-hidden />
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-helio">{EVENT_NAME} announcement</p>
              <p className="mt-1 text-2xl leading-snug text-cloud">{announcement}</p>
            </div>
          </div>
        </div>
      ) : null}
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
