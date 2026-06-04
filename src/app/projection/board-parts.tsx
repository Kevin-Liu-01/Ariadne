"use client";

import { Crown } from "lucide-react";
import type { ReactNode } from "react";
import { GEMS } from "@/constants/gems";
import type { Scene, SceneAccent } from "@/constants/scenes";
import { GemIcon } from "@/components/gem-icon";
import type { ProjectionSnapshot, TileState } from "@/domain/projection";
import { cn } from "@/lib/utils";

/** Everything a stage needs to paint the board. Built once per poll in the page. */
export interface BoardView {
  ordered: TileState[];
  stats: ProjectionSnapshot["stats"];
  sceneMeta: Scene;
  puzzleImage: string | null;
  flash: Record<string, number>;
  /** Inbound SMS ripple timestamps (purple pulse, separate from mission flash). */
  ripple: Record<string, number>;
  /** Guests visible as VM/container tiles once gameplay is live. */
  vmSpawn: Record<string, boolean>;
  eventPhone: string;
  topScore: number;
  activeCount: number;
  fadedCount: number;
}

/** Static class strings per accent so Tailwind keeps them; never build these dynamically. */
export const ACCENT: Record<SceneAccent, { text: string; border: string; soft: string; dot: string }> = {
  helio: { text: "text-helio", border: "border-helio/45", soft: "bg-helio/10", dot: "bg-helio" },
  topaz: { text: "text-gem-topaz", border: "border-gem-topaz/45", soft: "bg-gem-topaz/10", dot: "bg-gem-topaz" },
  peridot: { text: "text-gem-peridot", border: "border-gem-peridot/45", soft: "bg-gem-peridot/10", dot: "bg-gem-peridot" },
  garnet: { text: "text-gem-garnet", border: "border-gem-garnet/55", soft: "bg-gem-garnet/10", dot: "bg-gem-garnet" },
  aquamarine: { text: "text-gem-aquamarine", border: "border-gem-aquamarine/45", soft: "bg-gem-aquamarine/10", dot: "bg-gem-aquamarine" },
  cloud: { text: "text-cloud", border: "border-nyx-line", soft: "bg-nyx-soft/60", dot: "bg-cloud" },
};

export function initials(tile: TileState): string {
  if (tile.displayName) {
    return tile.displayName
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);
  }
  return tile.gameId.slice(0, 2);
}

/** Stage headline block: accent kicker, big headline, tagline. */
export function StageHero({ sceneMeta, children }: { sceneMeta: Scene; children?: ReactNode }) {
  const accent = ACCENT[sceneMeta.accent];
  return (
    <div className="text-center">
      <p className={cn("text-xs uppercase tracking-[0.45em]", accent.text)}>{sceneMeta.id}</p>
      <h2 className="mt-2 font-display text-4xl font-extralight tracking-tight text-cloud sm:text-5xl">
        {sceneMeta.headline}
      </h2>
      <p className="mt-2 text-sm text-ash">{sceneMeta.tagline}</p>
      {children}
    </div>
  );
}

export function RoomMetric({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-ash">{label}</dt>
      <dd className={cn("mt-0.5 text-lg tabular-nums text-cloud", accent)}>{value}</dd>
    </div>
  );
}

/** A square gem tile. `accent` tints the top-three highlight to match the stage. */
export function PlayerTile({
  tile,
  rank,
  flash,
  ripple,
  vm,
  accent,
}: {
  tile: TileState;
  rank: number;
  flash: boolean;
  ripple: boolean;
  /** Gameplay live: container / VM box on the projection board. */
  vm?: boolean;
  accent: SceneAccent;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center border border-nyx-line/70 bg-nyx-soft/80 p-3 transition-all duration-500",
        vm && "tile-vm-spawn border-2 border-dashed border-helio/55 bg-helio/5 ring-1 ring-helio/25",
        rank <= 3 && !tile.eliminated && !vm && ACCENT[accent].border,
        tile.eliminated && "tile-eliminated",
        ripple && "tile-message-ripple",
        flash && !ripple && "border-helio shadow-[0_0_36px_rgba(210,190,255,0.55)] animate-pulse-slow",
      )}
    >
      {vm ? (
        <span className="absolute right-2 top-2 font-mono text-[9px] uppercase tracking-[0.35em] text-helio/80">
          vm
        </span>
      ) : null}
      <span className="absolute left-2 top-2 flex items-center gap-0.5 text-[10px] tabular-nums text-ash">
        {rank === 1 && !tile.eliminated ? (
          <Crown className={cn("h-3 w-3", ACCENT[accent].text)} strokeWidth={1.5} aria-hidden />
        ) : null}
        #{rank}
      </span>
      <GemIcon gem={tile.gem} size={32} />
      <p className={cn("mt-1 text-[10px] uppercase tracking-[0.15em]", ACCENT[accent].text)}>
        {GEMS[tile.gem].label}
      </p>
      <p className="mt-1 max-w-full truncate text-sm text-cloud">{tile.displayName ?? initials(tile)}</p>
      <p
        className={cn(
          "text-[10px] uppercase tracking-[0.18em] text-ash",
          vm && "font-mono tracking-wider text-helio/90",
        )}
      >
        {tile.gameId}
      </p>
      <p className="mt-auto pt-2 text-xl tabular-nums text-cloud">{tile.score}</p>
    </div>
  );
}

/** Ranked list rows, oldest projection pattern. `limit` trims to the leaders. */
export function LeaderboardList({
  ordered,
  accent,
  limit,
}: {
  ordered: TileState[];
  accent: SceneAccent;
  limit?: number;
}) {
  const rows = limit ? ordered.slice(0, limit) : ordered;
  return (
    <ol className="space-y-1.5">
      {rows.map((tile, i) => (
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
              <Crown className={cn("h-3 w-3", ACCENT[accent].text)} strokeWidth={1.5} aria-hidden />
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
  );
}
