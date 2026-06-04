"use client";

import { Crown, Hourglass, MessageSquare } from "lucide-react";
import type { Scene, SceneAccent } from "@/constants/scenes";
import { CLUES } from "@/constants/clues";
import { GEMS, GEM_IDS, type GemId } from "@/constants/gems";
import { WORD_PAIRS } from "@/constants/missions";
import { GEM_WHEEL_HUE } from "@/domain/gem-wheel";
import { GemIcon } from "@/components/gem-icon";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import type { TileState } from "@/domain/projection";
import { cn } from "@/lib/utils";
import {
  ACCENT,
  type BoardView,
  PlayerTile,
  RoomMetric,
  StageHero,
  initials,
} from "@/app/projection/board-parts";

const TILE_GRID = "grid content-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(148px,1fr))]";

type QuestId = "color" | "word" | "riddle";

const PRIMARY_GEMS: GemId[] = GEM_IDS.filter((g) => ["red", "yellow", "blue"].includes(GEM_WHEEL_HUE[g]));
const SECONDARY_GEMS: GemId[] = GEM_IDS.filter((g) =>
  ["purple", "green", "orange"].includes(GEM_WHEEL_HUE[g]),
);

/**
 * Picks the stage layout for the active scene. The whole game is ONE board: guests
 * progress color -> word -> riddle at their own pace, so the operator never swaps
 * quest boards. Empty non-arrival scenes wait for the first guest.
 */
export function BoardStage({ scene, view }: { scene: string; view: BoardView }) {
  if (view.ordered.length === 0 && scene !== "arrival") return <WaitingState sceneMeta={view.sceneMeta} />;
  switch (scene) {
    case "game":
      return <GameStage view={view} />;
    case "runway":
      return <RunwayStage view={view} />;
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
          Ariadne gives you a gem, a secret word, and your first mission.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className={cn("text-6xl font-extralight tabular-nums", accent.text)}>{view.stats.checkedIn}</p>
        <p className="text-xs uppercase tracking-[0.3em] text-ash">checked in so far</p>
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

/** A color-wheel triangle: three gems shown with their hue, for the Color Quest. */
function TriangleCard({ title, gems, accent }: { title: string; gems: GemId[]; accent: SceneAccent }) {
  return (
    <div className={cn("flex-1 border bg-nyx-soft/50 p-4", ACCENT[accent].border)}>
      <p className={cn("text-[11px] uppercase tracking-[0.3em]", ACCENT[accent].text)}>{title}</p>
      <div className="mt-3 flex items-start justify-around gap-2">
        {gems.map((g) => (
          <div key={g} className="flex flex-col items-center gap-1">
            <GemIcon gem={g} size={44} />
            <span className="text-sm text-cloud">{GEMS[g].label}</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-ash">{GEM_WHEEL_HUE[g]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const QUEST_META: Record<QuestId, { title: string; accent: SceneAccent }> = {
  color: { title: "Color Quest", accent: "helio" },
  word: { title: "Word Quest", accent: "peridot" },
  riddle: { title: "Riddle Quest", accent: "topaz" },
};

/** Inner reference content for one quest: the gems, the word combos, or the riddles. */
function QuestReferenceBody({ quest, accent }: { quest: QuestId; accent: SceneAccent }) {
  if (quest === "color") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-ash">Find three guests whose colors form a triangle; text their game IDs.</p>
        <TriangleCard title="primary" gems={PRIMARY_GEMS} accent={accent} />
        <TriangleCard title="secondary" gems={SECONDARY_GEMS} accent={accent} />
      </div>
    );
  }
  if (quest === "word") {
    return (
      <div>
        <p className="text-xs text-ash">Find the guest whose secret word completes a phrase with yours.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WORD_PAIRS.map(([a, b]) => (
            <span
              key={`${a}-${b}`}
              className="flex items-center gap-1 border border-nyx-line/60 bg-nyx-soft/50 px-2 py-1 text-xs text-cloud"
            >
              <span>{a}</span>
              <span className={ACCENT[accent].text}>+</span>
              <span>{b}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs text-ash">Each guest gets three of these by text. Reply with one-word answers.</p>
      <ol className="mt-2 space-y-1.5">
        {CLUES.map((c, i) => (
          <li key={c.id} className="flex gap-2 text-xs leading-snug text-cloud">
            <span className={cn("shrink-0 tabular-nums", ACCENT[accent].text)}>{i + 1}.</span>
            <span>{c.prompt}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** One quest's reference card in the rail. All three show at once during the game. */
function QuestReferenceCard({ quest }: { quest: QuestId }) {
  const { title, accent } = QUEST_META[quest];
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col border bg-nyx-soft/50 p-3", ACCENT[accent].border)}>
      <p className={cn("text-[11px] uppercase tracking-[0.3em]", ACCENT[accent].text)}>{title}</p>
      <div className="mt-2 min-h-0 flex-1 overflow-auto">
        <QuestReferenceBody quest={quest} accent={accent} />
      </div>
    </div>
  );
}

/**
 * The unified game board, shown for the whole game: a grid leaderboard of every
 * guest (rank, gem, the quest level they're on, points) above a rail that shows
 * all three quest references at once. Guests progress at their own pace, so the
 * board never swaps per quest.
 */
function GameStage({ view }: { view: BoardView }) {
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col gap-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-helio">the labyrinth, live</p>
          <h2 className="mt-1 font-display text-3xl font-extralight text-cloud">{view.sceneMeta.headline}</h2>
          <p className="mt-1 text-sm text-ash">Color, word, riddle, solved at your own pace.</p>
        </div>
        <dl className="flex items-end gap-6">
          <RoomMetric label="players" value={view.ordered.length} />
          <RoomMetric label="quests solved" value={view.stats.missionsCompleted} accent="text-helio" />
          <RoomMetric label="top" value={view.topScore} accent="text-gem-topaz" />
        </dl>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-auto", TILE_GRID)}>
        {view.ordered.map((t, i) => (
          <PlayerTile
            key={t.gameId}
            tile={t}
            rank={i + 1}
            flash={!!view.flash[t.gameId]}
            ripple={!!view.ripple[t.gameId]}
            vm={!!view.vmSpawn[t.gameId]}
            accent={view.sceneMeta.accent}
          />
        ))}
      </div>

      <div className="grid max-h-[34dvh] shrink-0 gap-3 lg:grid-cols-3">
        <QuestReferenceCard quest="color" />
        <QuestReferenceCard quest="word" />
        <QuestReferenceCard quest="riddle" />
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
