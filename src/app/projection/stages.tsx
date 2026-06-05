"use client";

import { Crown, Hourglass, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import type { Scene, SceneAccent } from "@/constants/scenes";
import { CLUES } from "@/constants/clues";
import { PEOPLE_CAP } from "@/constants/display";
import { GEMS, GEM_IDS, type GemId } from "@/constants/gems";
import { WORD_PAIRS } from "@/constants/missions";
import { GEM_WHEEL_HUE } from "@/domain/gem-wheel";
import { capForDisplay } from "@/domain/overflow";
import { formatPhoneDisplay } from "@/domain/phone";
import { GemIcon } from "@/components/gem-icon";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { OverflowMore } from "@/components/overflow-more";
import { RunwayWordmark } from "@/components/runway-wordmark";
import type { TileState } from "@/domain/projection";
import { cn } from "@/lib/utils";
import {
  ACCENT,
  type BoardView,
  PlayerTile,
  StageHero,
  initials,
} from "@/app/projection/board-parts";

const STANDINGS_GRID =
  "grid content-start gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]";

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
  // Only the data-driven boards wait for players; cinematic scenes always paint.
  if (view.ordered.length === 0 && (scene === "game" || scene === "finale"))
    return <WaitingState sceneMeta={view.sceneMeta} />;
  switch (scene) {
    case "game":
      return <GameStage view={view} />;
    case "opening":
      return <OpeningStage view={view} />;
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
      <p className="animate-pulse-slow text-sm uppercase tracking-[0.4em]">waiting for the first guest...</p>
    </div>
  );
}

/** Shared cinematic wrapper: scene content centered over the page's ambient shader. */
function CinematicShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-[2] flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8 animate-rise">{children}</div>
    </div>
  );
}

/** Arrival: Run(way)time over a shader; the join number is the call to action. */
function ArrivalStage({ view }: { view: BoardView }) {
  const accent = ACCENT[view.sceneMeta.accent];
  const swarm = capForDisplay(view.ordered, PEOPLE_CAP.arrivalGems);
  return (
    <CinematicShell>
      <div>
        <RunwayWordmark size="xl" />
        <p className="mt-3 text-xs uppercase tracking-[0.5em] text-helio">{view.sceneMeta.headline}</p>
      </div>
      <div className={cn("w-full max-w-xl border bg-nyx-soft/75 p-8 backdrop-blur-sm", accent.border)}>
        <p className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.35em] text-ash">
          <MessageSquare className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          text to join
        </p>
        <p className="mt-3 font-display text-5xl tabular-nums tracking-wide text-cloud sm:text-6xl">
          {formatPhoneDisplay(view.eventPhone)}
        </p>
        <p className="mt-3 text-sm text-ash">
          Ariadne gives you a gem, a secret word, and your first mission.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className={cn("text-6xl font-extralight tabular-nums", accent.text)}>{view.stats.checkedIn}</p>
        <p className="text-xs uppercase tracking-[0.3em] text-ash">checked in so far</p>
        {view.ordered.length > 0 ? (
          <div className="mt-2 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {swarm.visible.map((t) => (
              <GemIcon key={t.gameId} gem={t.gem} size={22} />
            ))}
            <OverflowMore count={swarm.overflow} />
          </div>
        ) : (
          <p className="text-sm text-ash">Be the first to step into the labyrinth.</p>
        )}
      </div>
    </CinematicShell>
  );
}

/** Opening: the cinematic Run(way)time title card right before the game begins. */
function OpeningStage({ view }: { view: BoardView }) {
  return (
    <CinematicShell>
      <LabyrinthThread size={120} animate />
      <RunwayWordmark size="hero" />
      <p className="max-w-2xl text-lg leading-relaxed text-cloud/80">{view.sceneMeta.tagline}</p>
      <p className="text-sm text-ash">
        <span className="text-2xl font-extralight tabular-nums text-cloud">{view.stats.checkedIn}</span> in the
        labyrinth so far
      </p>
    </CinematicShell>
  );
}

/** Runway: cinematic and calm; the mark breathes while the room watches the show. */
function RunwayStage({ view }: { view: BoardView }) {
  const roster = capForDisplay(view.ordered, PEOPLE_CAP.runwayPills);
  return (
    <CinematicShell>
      <LabyrinthThread size={130} animate />
      <RunwayWordmark size="hero" />
      <p className="text-base leading-relaxed text-cloud/80">{view.sceneMeta.tagline}</p>
      {view.ordered.length > 0 ? (
        <div className="flex max-w-4xl flex-wrap items-center justify-center gap-2.5 opacity-80">
          {roster.visible.map((t) => (
            <span
              key={t.gameId}
              className="flex items-center gap-2 border border-nyx-line/60 bg-nyx-soft/50 px-3 py-1.5"
            >
              <GemIcon gem={t.gem} size={16} />
              <span className="text-xs text-ash">{t.displayName ?? initials(t)}</span>
            </span>
          ))}
          <OverflowMore count={roster.overflow} />
        </div>
      ) : null}
    </CinematicShell>
  );
}

/** A color-wheel triangle: three gems shown with their hue, for the Color Quest. */
function TriangleCard({ title, gems, accent }: { title: string; gems: GemId[]; accent: SceneAccent }) {
  return (
    <div className={cn("border bg-nyx/55 p-4", ACCENT[accent].border)}>
      <p className={cn("text-[11px] uppercase tracking-[0.3em]", ACCENT[accent].text)}>{title}</p>
      <div className="mt-3 flex items-start justify-around gap-2">
        {gems.map((g) => (
          <div key={g} className="flex flex-col items-center gap-1.5">
            <GemIcon gem={g} size={54} />
            <span className="text-base text-cloud">{GEMS[g].label}</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-ash">{GEM_WHEEL_HUE[g]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const QUEST_META: Record<QuestId, { title: string; accent: SceneAccent; hint: string }> = {
  color: {
    title: "Color Quest",
    accent: "helio",
    hint: "Find two other guests so your three colors form a triangle, then text their game IDs.",
  },
  word: {
    title: "Word Quest",
    accent: "peridot",
    hint: "Find the guest whose secret word completes a phrase with yours.",
  },
  riddle: {
    title: "Riddle Quest",
    accent: "topaz",
    hint: "Everyone gets three by text. Reply with one-word answers.",
  },
};

/** Inner reference content for one quest: the gems, the word combos, or the riddles. */
function QuestReferenceBody({ quest, accent }: { quest: QuestId; accent: SceneAccent }) {
  if (quest === "color") {
    return (
      <div className="flex flex-col gap-3">
        <TriangleCard title="primary" gems={PRIMARY_GEMS} accent={accent} />
        <TriangleCard title="secondary" gems={SECONDARY_GEMS} accent={accent} />
      </div>
    );
  }
  if (quest === "word") {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {WORD_PAIRS.map(([a, b]) => (
          <span
            key={`${a}-${b}`}
            className="flex items-center justify-center gap-1 border border-nyx-line/60 bg-nyx/55 px-2 py-1.5 text-sm text-cloud"
          >
            <span>{a}</span>
            <span className={cn("font-light", ACCENT[accent].text)}>+</span>
            <span>{b}</span>
          </span>
        ))}
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {CLUES.map((c, i) => (
        <li key={c.id} className="flex gap-2.5 text-[15px] leading-relaxed text-cloud">
          <span className={cn("shrink-0 font-medium tabular-nums", ACCENT[accent].text)}>{i + 1}.</span>
          <span>{c.prompt}</span>
        </li>
      ))}
    </ol>
  );
}

/** One quest's reference card. All three show side by side as the main game board. */
function QuestReferenceCard({ quest }: { quest: QuestId }) {
  const { title, accent, hint } = QUEST_META[quest];
  return (
    <section className={cn("flex min-h-0 min-w-0 flex-col border bg-nyx-soft/70", ACCENT[accent].border)}>
      <header className={cn("flex items-center gap-2.5 border-b px-4 py-3", ACCENT[accent].border)}>
        <span className={cn("h-2.5 w-2.5 rounded-full", ACCENT[accent].dot)} aria-hidden />
        <p className={cn("text-base uppercase tracking-[0.3em]", ACCENT[accent].text)}>{title}</p>
      </header>
      <p className="border-b border-nyx-line/40 px-4 py-2.5 text-sm leading-snug text-cloud/75">{hint}</p>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3.5">
        <QuestReferenceBody quest={quest} accent={accent} />
      </div>
    </section>
  );
}

/** Live standings band: every guest as a ranked gem tile, full width below the quests. */
function StandingsBand({ view }: { view: BoardView }) {
  // The projector can't scroll, so tiles past what fits would vanish: cap to the leaders
  // and let a "+N more" tile stand in for the rest of the field.
  const board = capForDisplay(view.ordered, PEOPLE_CAP.standingsTiles);
  return (
    <section className="flex max-h-[30dvh] shrink-0 flex-col border border-nyx-line bg-nyx-soft/70">
      <header className="flex items-center justify-between border-b border-nyx-line px-4 py-2.5">
        <p className="text-base uppercase tracking-[0.3em] text-cloud">standings</p>
        <span className="text-xs uppercase tracking-[0.2em] text-ash">
          {view.ordered.length} {view.ordered.length === 1 ? "player" : "players"}
        </span>
      </header>
      {view.ordered.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ash">The first gem lands here.</p>
      ) : (
        <div className={cn("min-h-0 flex-1 overflow-auto p-3", STANDINGS_GRID)}>
          {board.visible.map((t, i) => (
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
          <OverflowMore count={board.overflow} variant="tile" />
        </div>
      )}
    </section>
  );
}

/**
 * The unified game board, shown for the whole game. The three quest references fill the
 * top as wide, readable columns (color / word / riddle, each scrolling on its own), with
 * the live standings as a full-width band below. Guests progress at their own pace, so
 * the board never swaps per quest.
 */
function GameStage({ view }: { view: BoardView }) {
  return (
    <div className="relative z-[2] flex min-h-0 flex-1 flex-col gap-4 pt-4">
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 [grid-template-rows:minmax(0,1fr)]">
        <QuestReferenceCard quest="color" />
        <QuestReferenceCard quest="word" />
        <QuestReferenceCard quest="riddle" />
      </div>
      <StandingsBand view={view} />
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
  const field = capForDisplay(rest, PEOPLE_CAP.finaleField);
  return (
    <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-8 py-6">
      <StageHero sceneMeta={view.sceneMeta} />
      <div className="flex w-full max-w-3xl items-end justify-center gap-4">
        <PodiumCard tile={second} place={2} accent={view.sceneMeta.accent} />
        <PodiumCard tile={first} place={1} accent={view.sceneMeta.accent} />
        <PodiumCard tile={third} place={3} accent={view.sceneMeta.accent} />
      </div>
      {rest.length > 0 ? (
        <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {field.visible.map((t, i) => (
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
          <OverflowMore count={field.overflow} />
        </div>
      ) : null}
    </div>
  );
}
