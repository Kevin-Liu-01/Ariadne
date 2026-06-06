"use client";

import { Crown, Hourglass } from "lucide-react";
import { GemIcon } from "@/components/gem-icon";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { RunwayWordmark } from "@/components/runway-wordmark";
import { cn } from "@/lib/utils";
import type { PlayerView } from "@/server/play/player-service";
import { type ActFn, BarCard, GameConsole, SongsCard } from "./game-console";

interface StageProps {
  view: PlayerView;
  act: ActFn;
  busy: boolean;
}

/** The guest's color, secret word, and game id: shown whenever the screen is cinematic, not playing. */
function IdentityCard({ view }: { view: PlayerView }) {
  const p = view.participant;
  return (
    <div className="w-full max-w-sm border border-nyx-line bg-nyx-soft/70 p-6 text-center">
      <div className="flex justify-center">
        <GemIcon gem={p.gem} size={56} />
      </div>
      <p className="mt-3 text-xl text-cloud">{p.gemLabel}</p>
      <p className="text-xs text-ash">your gem</p>
      <div className="mt-5 grid grid-cols-2 gap-2 text-left text-sm">
        <div className="border border-nyx-line bg-nyx px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ash">game id</p>
          <p className="tabular-nums tracking-[0.12em] text-cloud">{p.gameId}</p>
        </div>
        <div className="border border-nyx-line bg-nyx px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ash">secret word</p>
          <p className="truncate text-cloud">{p.secretWord}</p>
        </div>
      </div>
    </div>
  );
}

/** The bar and DJ request cards, available in every scene once a guest is checked in. */
function Amenities({ view, act, busy }: StageProps) {
  return (
    <div className="flex w-full flex-col gap-3 text-left">
      <BarCard view={view} act={act} busy={busy} />
      <SongsCard view={view} act={act} busy={busy} />
    </div>
  );
}

/** Arrival / opening: checked in, waiting for the game. The bar and DJ are open while
 *  they wait, so the order/request cards ride along under the identity. */
function WaitingStage({ view, act, busy }: StageProps) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center animate-rise">
      <div className="flex flex-col items-center gap-3">
        <LabyrinthThread size={84} animate />
        <RunwayWordmark size="lg" />
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
          <Hourglass className="h-3.5 w-3.5 animate-pulse-slow" strokeWidth={1.5} aria-hidden />
          you're checked in
        </p>
      </div>
      <IdentityCard view={view} />
      <p className="max-w-xs text-sm leading-relaxed text-ash">
        The bar and DJ are open, grab a drink or request a song below. Your quests appear here once
        the room goes live.
      </p>
      <Amenities view={view} act={act} busy={busy} />
      <p className="text-xs uppercase tracking-[0.3em] text-ash">
        <span className="text-cloud">{view.totalPlayers}</span> in the labyrinth
      </p>
    </div>
  );
}

/** Calm cinematic interlude (runway / visuals): eyes on the room, with the bar and DJ still open. */
function CalmInterludeStage({ view, act, busy, line }: StageProps & { line: string }) {
  const p = view.participant;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center animate-rise">
      <LabyrinthThread size={92} animate />
      <RunwayWordmark size="hero" />
      <p className="text-base leading-relaxed text-cloud/80">{line}</p>
      <div className="flex items-center gap-3 border border-nyx-line/60 bg-nyx-soft/50 px-4 py-2.5">
        <GemIcon gem={p.gem} size={22} />
        <span className="text-sm text-cloud">{p.gemLabel}</span>
        <span className="text-sm tabular-nums text-helio">{p.score} pts</span>
      </div>
      <Amenities view={view} act={act} busy={busy} />
    </div>
  );
}

const PLACE_LABEL: Record<number, string> = { 1: "Winner", 2: "Runner-up", 3: "Third place" };

/** Finale: the guest's own final screen, rank and score, take a bow. */
function FinaleStage({ view }: { view: PlayerView }) {
  const p = view.participant;
  const place = view.rank ?? 0;
  const podium = place >= 1 && place <= 3;
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center animate-rise">
      <p className="text-xs uppercase tracking-[0.5em] text-helio">Finale</p>
      <RunwayWordmark size="xl" />
      <div
        className={cn(
          "flex w-full flex-col items-center gap-3 border bg-nyx-soft/70 p-8",
          podium ? "border-helio/50" : "border-nyx-line",
        )}
      >
        {place === 1 ? <Crown className="h-8 w-8 text-helio" strokeWidth={1.5} aria-hidden /> : null}
        <GemIcon gem={p.gem} size={52} />
        {p.displayName ? <p className="text-lg text-cloud">{p.displayName}</p> : null}
        <p className="text-6xl font-extralight tabular-nums text-cloud">{p.score}</p>
        <p className="text-xs uppercase tracking-[0.3em] text-ash">points</p>
        {view.rank ? (
          <p className="text-sm text-helio">
            {PLACE_LABEL[place] ?? `#${view.rank}`} of {view.totalPlayers}
          </p>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-ash">
        {view.missions.questsDone}/{view.missions.questsTotal} quests cleared. Take a bow.
      </p>
    </div>
  );
}

/** Pick the screen for the live scene, so the phone moves through the night with the room. */
export function LiveStage({ view, act, busy }: StageProps) {
  switch (view.scene) {
    case "game":
      return <GameConsole view={view} act={act} busy={busy} />;
    case "visuals":
      return <CalmInterludeStage view={view} act={act} busy={busy} line="Look up. The room is the canvas." />;
    case "runway":
      return <CalmInterludeStage view={view} act={act} busy={busy} line="Eyes up. The room is yours." />;
    case "finale":
      return <FinaleStage view={view} />;
    default:
      return <WaitingStage view={view} act={act} busy={busy} />;
  }
}
