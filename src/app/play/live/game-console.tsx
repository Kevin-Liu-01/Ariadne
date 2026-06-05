"use client";

import { Check, Hash, KeyRound, LifeBuoy, Music, Send, Target, Wine } from "lucide-react";
import { useId, useState } from "react";
import { DRINK_MENU, type MenuItem } from "@/constants/drinks";
import { GemIcon } from "@/components/gem-icon";
import { cn } from "@/lib/utils";
import type { PlayerView } from "@/server/play/player-service";
import { type ActionResponse, confirmPickup, flagHost, orderDrink, requestSong, submitMission } from "./actions";

/** Run an action, surface its line as a toast, and refresh the view. Returns the outcome. */
export type ActFn = (run: () => Promise<ActionResponse>) => Promise<ActionResponse>;

interface CardProps {
  view: PlayerView;
  act: ActFn;
  busy: boolean;
}

const AVAILABLE_DRINKS = DRINK_MENU.filter((d) => d.available);

const BAR_GROUPS: { label: string; category: MenuItem["category"] }[] = [
  { label: "On the house", category: "cocktail" },
  { label: "Beer", category: "beer" },
  { label: "Wine", category: "wine" },
  { label: "Zero-proof", category: "zero_proof" },
];

const DRINK_STATUS_LABEL: Record<string, string> = {
  queued: "in the queue",
  in_progress: "being made",
  ready: "ready at the bar",
};

const SONG_STATUS_LABEL: Record<string, string> = {
  requested: "sent to the DJ",
  accepted: "in the DJ queue",
  played: "played",
  rejected: "the DJ passed",
};

/** A labelled panel, the shared chrome for each action group. */
function Panel({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof Wine;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-nyx-line bg-nyx-soft/70 p-5">
      <h2 className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-helio">
        <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Gem, game id, secret word, score, and standing: the always-on identity header. */
function IdentityStrip({ view }: { view: PlayerView }) {
  const p = view.participant;
  return (
    <section className="border border-nyx-line bg-nyx-soft/70 p-5">
      <div className="flex items-center gap-3">
        <GemIcon gem={p.gem} size={34} />
        <div className="min-w-0">
          <p className="text-lg leading-tight text-cloud">{p.gemLabel}</p>
          <p className="text-xs text-ash">your gem: team up with other colors</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl tabular-nums text-helio">{p.score}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ash">
            points{view.rank ? ` · #${view.rank} of ${view.totalPlayers}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 border border-nyx-line bg-nyx px-3 py-2">
          <Hash className="h-3.5 w-3.5 shrink-0 text-ash" strokeWidth={1.5} aria-hidden />
          <span className="tabular-nums tracking-[0.12em] text-cloud">{p.gameId}</span>
        </div>
        <div className="flex items-center gap-2 border border-nyx-line bg-nyx px-3 py-2">
          <KeyRound className="h-3.5 w-3.5 shrink-0 text-helio" strokeWidth={1.5} aria-hidden />
          <span className="truncate text-cloud">{p.secretWord}</span>
        </div>
      </div>
    </section>
  );
}

/** The three quests as progress dots, then the current quest with an answer field. */
function MissionsCard({ view, act, busy }: CardProps) {
  const inputId = useId();
  const [answer, setAnswer] = useState("");
  const current = view.missions.current;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || busy) return;
    const res = await act(() => submitMission(answer));
    if (res.data.result === "correct") setAnswer("");
  }

  return (
    <Panel title="Quests" Icon={Target}>
      <ul className="mb-4 flex gap-2">
        {view.missions.quests.map((q) => (
          <li
            key={q.id}
            className={cn(
              "flex flex-1 items-center gap-2 border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.12em]",
              q.done ? "border-gem-peridot/50 text-gem-peridot" : "border-nyx-line/70 text-ash",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                q.done ? "bg-gem-peridot" : "border border-ash/60",
              )}
              aria-hidden
            />
            {q.title.replace(" Quest", "")}
          </li>
        ))}
      </ul>

      {current ? (
        <form onSubmit={submit} className="grid gap-3">
          <p className="text-sm font-semibold text-cloud">{current.title}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ash">{current.prompt}</p>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="game IDs, a secret word, or a riddle answer"
              className="min-w-0 flex-1 border border-nyx-line bg-nyx px-3 py-2.5 text-cloud outline-none placeholder:text-ash/60 focus:border-helio/50"
            />
            <button
              type="submit"
              disabled={busy || !answer.trim()}
              className={cn(
                "flex items-center gap-1.5 border border-helio/50 bg-helio/15 px-3 py-2.5 text-sm text-cloud transition-colors hover:bg-helio/25",
                (busy || !answer.trim()) && "opacity-50",
              )}
            >
              <Send className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              send
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm leading-relaxed text-ash">
          All three quests complete. Stay near the screen.
        </p>
      )}
    </Panel>
  );
}

/** Tap-to-order chips grouped by category, plus the live status of the open order. */
export function BarCard({ view, act, busy }: CardProps) {
  const drink = view.drink;
  return (
    <Panel title="The bar" Icon={Wine}>
      <div className="grid gap-3">
        {BAR_GROUPS.map((group) => {
          const items = AVAILABLE_DRINKS.filter((d) => d.category === group.category);
          if (items.length === 0) return null;
          return (
            <div key={group.category}>
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-ash">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void act(() => orderDrink(d.label))}
                    className={cn(
                      "border border-nyx-line bg-nyx px-3 py-2 text-sm text-cloud transition-colors hover:border-helio/50 hover:text-helio",
                      busy && "opacity-50",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {drink ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-nyx-line/60 pt-4">
          <p className="text-sm text-cloud">
            {drink.label}{" "}
            <span className="text-ash">{DRINK_STATUS_LABEL[drink.status] ?? drink.status}</span>
          </p>
          {drink.status === "ready" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void act(() => confirmPickup())}
              className={cn(
                "ml-auto flex items-center gap-1.5 border border-gem-peridot/50 px-3 py-1.5 text-sm text-cloud transition-colors hover:bg-gem-peridot/15",
                busy && "opacity-50",
              )}
            >
              <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              I grabbed it
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-ash/80">
          One special cocktail on the house. Beer, wine, and zero-proof are unlimited until supplies
          run out.
        </p>
      )}
    </Panel>
  );
}

/** Request a track and watch its DJ status. */
export function SongsCard({ view, act, busy }: CardProps) {
  const inputId = useId();
  const [song, setSong] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!song.trim() || busy) return;
    const res = await act(() => requestSong(song));
    if (res.ok && res.data.status === "queued") setSong("");
  }

  return (
    <Panel title="Songs" Icon={Music}>
      <form onSubmit={submit} className="flex gap-2">
        <input
          id={inputId}
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="a track or artist for the DJ"
          className="min-w-0 flex-1 border border-nyx-line bg-nyx px-3 py-2.5 text-cloud outline-none placeholder:text-ash/60 focus:border-helio/50"
        />
        <button
          type="submit"
          disabled={busy || !song.trim()}
          className={cn(
            "flex items-center gap-1.5 border border-helio/50 bg-helio/15 px-3 py-2.5 text-sm text-cloud transition-colors hover:bg-helio/25",
            (busy || !song.trim()) && "opacity-50",
          )}
        >
          <Send className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          send
        </button>
      </form>
      {view.song ? (
        <p className="mt-3 text-sm text-cloud">
          "{view.song.text}"{" "}
          <span className="text-ash">{SONG_STATUS_LABEL[view.song.status] ?? view.song.status}</span>
        </p>
      ) : null}
    </Panel>
  );
}

/** A short help line and a "need a human?" escalation that posts an operator alert. */
export function HelpFlagBar({ act, busy }: { act: ActFn; busy: boolean }) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || busy) return;
    const res = await act(() => flagHost(reason));
    if (res.ok) {
      setReason("");
      setOpen(false);
    }
  }

  return (
    <section className="border border-nyx-line/70 bg-nyx-soft/50 p-4">
      <p className="text-[11px] leading-relaxed text-ash">
        Tap a quest to answer, grab a drink, or request a song. The room board mirrors every solve.
      </p>
      {open ? (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            id={inputId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="what do you need from a host?"
            className="min-w-0 flex-1 border border-nyx-line bg-nyx px-3 py-2 text-sm text-cloud outline-none placeholder:text-ash/60 focus:border-helio/50"
          />
          <button
            type="submit"
            disabled={busy || !reason.trim()}
            className={cn(
              "border border-helio/50 bg-helio/15 px-3 py-2 text-sm text-cloud transition-colors hover:bg-helio/25",
              (busy || !reason.trim()) && "opacity-50",
            )}
          >
            send
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-ash transition-colors hover:text-cloud"
        >
          <LifeBuoy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          need a human?
        </button>
      )}
    </section>
  );
}

/** The live game surface: identity, quests, bar, songs, and help, stacked for a phone. */
export function GameConsole({ view, act, busy }: CardProps) {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <IdentityStrip view={view} />
      <MissionsCard view={view} act={act} busy={busy} />
      <BarCard view={view} act={act} busy={busy} />
      <SongsCard view={view} act={act} busy={busy} />
      <HelpFlagBar act={act} busy={busy} />
    </div>
  );
}
