"use client";

import { Crown, Hourglass, Images, MessageSquare } from "lucide-react";
import type { Scene, SceneAccent } from "@/constants/scenes";
import { GemIcon } from "@/components/gem-icon";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import type { TileState } from "@/domain/projection";
import { cn } from "@/lib/utils";
import {
  ACCENT,
  type BoardView,
  LeaderboardList,
  PlayerTile,
  RoomMetric,
  StageHero,
  initials,
} from "@/app/projection/board-parts";

const TILE_GRID = "grid content-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(148px,1fr))]";

/** Picks the stage layout for the active scene. Empty non-arrival scenes wait for the first thread. */
export function BoardStage({ scene, view }: { scene: string; view: BoardView }) {
  if (view.ordered.length === 0 && scene !== "arrival") return <WaitingState sceneMeta={view.sceneMeta} />;
  switch (scene) {
    case "runway":
      return <RunwayStage view={view} />;
    case "missions":
      return <MissionsStage view={view} />;
    case "puzzle":
      return <PuzzleStage view={view} />;
    case "elimination":
      return <EliminationStage view={view} />;
    case "finale":
      return <FinaleStage view={view} />;
    default:
      return <ArrivalStage view={view} />;
  }
}

function WaitingState({ sceneMeta }: { sceneMeta: Scene }) {
  return (
    <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-5 text-ash">
      <StageHero sceneMeta={sceneMeta} />
      <Hourglass className="h-8 w-8 animate-pulse-slow" strokeWidth={1} aria-hidden />
      <p className="animate-pulse-slow text-sm uppercase tracking-[0.4em]">waiting for the first thread...</p>
    </div>
  );
}

/** Arrival: the join line is the hero; gems collect as guests thread in. */
function ArrivalStage({ view }: { view: BoardView }) {
  const accent = ACCENT[view.sceneMeta.accent];
  return (
    <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-10 py-8">
      <StageHero sceneMeta={view.sceneMeta} />
      <div className={cn("w-full max-w-xl border bg-nyx-soft/70 p-8 text-center", accent.border)}>
        <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.35em] text-ash">
          <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          text to join
        </p>
        <p className="mt-3 font-display text-5xl tabular-nums tracking-wide text-cloud sm:text-6xl">
          {view.eventPhone}
        </p>
        <p className="mt-3 text-sm text-ash">
          Ariadne threads you a gem, a secret word, and your first mission.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className={cn("text-6xl font-extralight tabular-nums", accent.text)}>{view.stats.checkedIn}</p>
        <p className="text-xs uppercase tracking-[0.3em] text-ash">threaded in so far</p>
        {view.ordered.length > 0 ? (
          <div className="mt-2 flex max-w-2xl flex-wrap justify-center gap-2">
            {view.ordered.map((t) => (
              <GemIcon key={t.gameId} gem={t.gem} size={22} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ash">Be the first to step into the labyrinth.</p>
        )}
      </div>
    </div>
  );
}

/** Runway: cinematic and calm. The mark breathes; scores hold. */
function RunwayStage({ view }: { view: BoardView }) {
  return (
    <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-8 py-8">
      <LabyrinthThread size={140} animate />
      <StageHero sceneMeta={view.sceneMeta} />
      <div className="flex max-w-4xl flex-wrap items-center justify-center gap-3 opacity-80">
        {view.ordered.map((t) => (
          <span
            key={t.gameId}
            className="flex items-center gap-2 border border-nyx-line/60 bg-nyx-soft/40 px-3 py-1.5"
          >
            <GemIcon gem={t.gem} size={16} />
            <span className="text-xs text-ash">{t.displayName ?? initials(t)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Missions: the competitive board. Leaderboard rail beside a live gem grid. */
function MissionsStage({ view }: { view: BoardView }) {
  const accent = ACCENT[view.sceneMeta.accent];
  return (
    <div className="relative z-[2] flex flex-1 flex-col gap-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={cn("text-xs uppercase tracking-[0.4em]", accent.text)}>{view.sceneMeta.id}</p>
          <h2 className="mt-1 font-display text-3xl font-extralight text-cloud">{view.sceneMeta.headline}</h2>
        </div>
        <p className="text-sm text-ash">
          <span className={accent.text}>{view.stats.missionsCompleted}</span> missions solved tonight
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-stretch">
        <aside className="flex w-full shrink-0 flex-col border border-nyx-line/70 bg-nyx-soft/60 p-4 lg:w-80">
          <div className="flex items-center justify-between gap-2">
            <h3 className={cn("text-xs uppercase tracking-[0.25em]", accent.text)}>leaderboard</h3>
            <span className="text-xs tabular-nums text-ash">{view.ordered.length} players</span>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-b border-nyx-line/60 pb-3 text-center">
            <RoomMetric label="active" value={view.activeCount} />
            <RoomMetric label="faded" value={view.fadedCount} />
            <RoomMetric label="top" value={view.topScore} />
          </dl>
          <div className="mt-3 flex-1 overflow-auto">
            <LeaderboardList ordered={view.ordered} accent={view.sceneMeta.accent} />
          </div>
        </aside>
        <div className={cn("min-w-0 flex-1", TILE_GRID)}>
          {view.ordered.map((t, i) => (
            <PlayerTile
              key={t.gameId}
              tile={t}
              rank={i + 1}
              flash={!!view.flash[t.gameId]}
              accent={view.sceneMeta.accent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Puzzle: the cropped image is the hero, with a thin ribbon of leaders. */
function PuzzleStage({ view }: { view: BoardView }) {
  const accent = ACCENT[view.sceneMeta.accent];
  return (
    <div className="relative z-[2] flex flex-1 flex-col gap-6 py-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 lg:flex-row">
        {view.puzzleImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- event asset, intentionally blurred
          <img
            src={view.puzzleImage}
            alt="decode this"
            className="max-h-[46vh] w-auto border border-nyx-line object-contain blur-[1.5px] contrast-125"
          />
        ) : (
          <div className={cn("flex h-56 w-56 items-center justify-center border", accent.border)}>
            <Images className={cn("h-10 w-10", accent.text)} strokeWidth={1} aria-hidden />
          </div>
        )}
        <div className="max-w-md text-center lg:text-left">
          <p className={cn("text-xs uppercase tracking-[0.4em]", accent.text)}>{view.sceneMeta.id}</p>
          <h2 className="mt-2 font-display text-4xl font-extralight text-cloud">{view.sceneMeta.headline}</h2>
          <p className="mt-3 text-lg text-cloud">
            Text Ariadne what this is: name the myth, object, place, or source.
          </p>
          <p className="mt-2 text-sm text-ash">
            {view.puzzleImage ? "Image is live on the big screen." : "Operator: load a puzzle to begin."}
          </p>
        </div>
      </div>
      <div className="border-t border-nyx-line/60 pt-4">
        <p className="text-[10px] uppercase tracking-widest text-ash">leaders</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {view.ordered.slice(0, 6).map((t, i) => (
            <span
              key={t.gameId}
              className="flex items-center gap-2 border border-nyx-line/70 bg-nyx-soft/50 px-3 py-1.5"
            >
              <span className="text-[10px] tabular-nums text-ash">#{i + 1}</span>
              <GemIcon gem={t.gem} size={14} />
              <span className="text-xs text-cloud">{t.displayName ?? initials(t)}</span>
              <span className="text-xs tabular-nums text-ash">{t.score}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Elimination: who is still in versus who has faded, side by side. */
function EliminationStage({ view }: { view: BoardView }) {
  const accent = ACCENT[view.sceneMeta.accent];
  const active = view.ordered.filter((t) => !t.eliminated);
  const faded = view.ordered.filter((t) => t.eliminated);
  return (
    <div className="relative z-[2] flex flex-1 flex-col gap-5 py-6">
      <StageHero sceneMeta={view.sceneMeta} />
      <div className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-stretch">
        <div className="flex flex-1 flex-col">
          <p className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-gem-peridot">still in</span>
            <span className="text-2xl tabular-nums text-cloud">{view.activeCount}</span>
          </p>
          <div className={cn("mt-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]", TILE_GRID)}>
            {active.map((t, i) => (
              <PlayerTile
                key={t.gameId}
                tile={t}
                rank={i + 1}
                flash={!!view.flash[t.gameId]}
                accent={view.sceneMeta.accent}
              />
            ))}
          </div>
        </div>
        <aside className={cn("flex w-full shrink-0 flex-col border bg-nyx-soft/40 p-4 lg:w-72", accent.border)}>
          <p className="flex items-baseline gap-2">
            <span className={cn("text-xs uppercase tracking-[0.3em]", accent.text)}>faded</span>
            <span className="text-2xl tabular-nums text-cloud">{view.fadedCount}</span>
          </p>
          <ol className="mt-3 flex-1 space-y-1.5 overflow-auto">
            {faded.length === 0 ? (
              <li className="text-sm text-ash">Nobody has faded. The thread holds.</li>
            ) : (
              faded.map((t) => (
                <li key={t.gameId} className="flex items-center gap-2 px-2 py-1.5 opacity-60">
                  <GemIcon gem={t.gem} size={14} />
                  <span className="flex-1 truncate text-sm text-ash line-through">
                    {t.displayName ?? initials(t)}
                  </span>
                  <span className="text-xs tabular-nums text-ash">{t.score}</span>
                </li>
              ))
            )}
          </ol>
        </aside>
      </div>
    </div>
  );
}

const PODIUM_HEIGHT: Record<number, string> = { 1: "h-44", 2: "h-36", 3: "h-32" };

function PodiumCard({ tile, place, accent }: { tile?: TileState; place: number; accent: SceneAccent }) {
  if (!tile) return <div className="w-28 sm:w-36" aria-hidden />;
  return (
    <div className="flex w-28 flex-col items-center sm:w-36">
      {place === 1 ? (
        <Crown className={cn("mb-1 h-6 w-6", ACCENT[accent].text)} strokeWidth={1.5} aria-hidden />
      ) : null}
      <GemIcon gem={tile.gem} size={place === 1 ? 44 : 34} />
      <p className="mt-1 max-w-full truncate text-sm text-cloud">{tile.displayName ?? initials(tile)}</p>
      <p className="text-[10px] tracking-[0.12em] text-ash">{tile.gameId}</p>
      <div
        className={cn(
          "mt-2 flex w-full flex-col items-center border bg-nyx-soft/60",
          PODIUM_HEIGHT[place],
          place === 1 ? ACCENT[accent].border : "border-nyx-line/70",
        )}
      >
        <span className="mt-2 text-[10px] uppercase tracking-widest text-ash">#{place}</span>
        <span className="mb-2 mt-auto text-2xl tabular-nums text-cloud">{tile.score}</span>
      </div>
    </div>
  );
}

/** Finale: a podium for the top three, with the rest of the field below. */
function FinaleStage({ view }: { view: BoardView }) {
  const [first, second, third, ...rest] = view.ordered;
  return (
    <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-8 py-6">
      <StageHero sceneMeta={view.sceneMeta} />
      <div className="flex w-full max-w-3xl items-end justify-center gap-4">
        <PodiumCard tile={second} place={2} accent={view.sceneMeta.accent} />
        <PodiumCard tile={first} place={1} accent={view.sceneMeta.accent} />
        <PodiumCard tile={third} place={3} accent={view.sceneMeta.accent} />
      </div>
      {rest.length > 0 ? (
        <div className="flex max-w-2xl flex-wrap justify-center gap-2">
          {rest.map((t, i) => (
            <span
              key={t.gameId}
              className="flex items-center gap-2 border border-nyx-line/60 bg-nyx-soft/40 px-3 py-1.5"
            >
              <span className="text-[10px] tabular-nums text-ash">#{i + 4}</span>
              <GemIcon gem={t.gem} size={14} />
              <span className="text-xs text-cloud">{t.displayName ?? initials(t)}</span>
              <span className="text-xs tabular-nums text-ash">{t.score}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
