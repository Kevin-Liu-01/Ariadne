import {
  ArrowRight,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  Palette,
  Puzzle,
  QrCode,
  Target,
  Users,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { DRINK_MENU } from "@/constants/drinks";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { GEMS, type GemId } from "@/constants/gems";
import { MISSIONS } from "@/constants/missions";
import { SCENES } from "@/constants/scenes";
import { GemIcon } from "@/components/gem-icon";
import { IMessageIcon } from "@/components/imessage-icon";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { TextReminders } from "@/components/text-reminders";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import { formatPhoneDisplay } from "@/domain/phone";

export const dynamic = "force-dynamic";

const STEPS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: MessageSquare,
    title: "Text to check in",
    body: "Text the event line. Ariadne checks you in with a color gem, a secret word, and your four-letter game ID.",
  },
  {
    Icon: Target,
    title: "Run the labyrinth",
    body: "Solve the three quests by text: match gem colors, find the guest who completes your phrase, and crack the riddles.",
  },
  {
    Icon: Wine,
    title: "Order by text",
    body: "Name any drink on the menu. Ariadne routes it to the bar and texts you the moment it's ready at pickup.",
  },
  {
    Icon: LayoutGrid,
    title: "Watch the board",
    body: "The room projection shows live scores and gems. Climb the ranks, solve together, and don't fade out.",
  },
];

/** Mission id -> glyph, keyed to the canonical MISSIONS catalog so titles and points stay sourced there. */
const QUEST_ICONS: Record<string, LucideIcon> = {
  "color-constellation": Palette,
  "word-thread": Users,
  "riddle-labyrinth": Puzzle,
};

/** The six gems split into the two color-wheel triangles the Color Quest is solved with. */
const GEM_TRIOS: { label: string; hint: string; ids: readonly GemId[] }[] = [
  { label: "Primary triangle", hint: "red · yellow · blue", ids: ["garnet", "moonstone", "aquamarine"] },
  { label: "Secondary triangle", hint: "purple · green · orange", ids: ["amethyst", "peridot", "topaz"] },
];

const COCKTAILS = DRINK_MENU.filter((d) => d.category === "cocktail" && d.available);

export default function PlayPage() {
  const phone = env.agentphone.phoneNumber;
  const smsHref = phone ? `sms:${phone}?&body=JOIN` : null;

  return (
    <main className="relative min-h-dvh bg-nyx scanlines">
      {/* Hero banner: brand mark, title, and the one action that starts the night. */}
      <section className="bgimg-nyx-waves relative overflow-hidden border-b border-nyx-line px-6 pb-16 pt-6">
        <div className="absolute inset-0 bg-gradient-to-b from-nyx/75 via-nyx/45 to-nyx/95" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-helio/20 blur-[100px]"
          aria-hidden
        />
        <div className="relative z-[2] mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center text-center animate-rise">
            <LabyrinthThread size={88} animate />
            <p className="mt-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-ash">
              <span className="crosshair" aria-hidden />
              {EVENT_NAME} · {VENUE}
            </p>
            <h1 className="mt-4 font-display text-6xl font-extralight leading-[0.95] tracking-tight text-cloud sm:text-7xl">
              How to play
            </h1>
            <p className="mt-4 text-sm text-helio">{PRODUCT_TAGLINE}</p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ash">
              {PRODUCT_NAME} is your personal agent for the night. Check in, get a gem and a secret
              word, solve the labyrinth, and order drinks, all by text.
            </p>

            <div className="mt-9 w-full max-w-sm">
              {smsHref ? (
                <a
                  href={smsHref}
                  className="group block border border-helio/50 bg-helio/15 px-6 py-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-helio/25"
                >
                  <span className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.3em] text-helio">
                    <IMessageIcon size={16} />
                    text to check in
                  </span>
                  <span className="mt-1.5 block text-2xl tabular-nums tracking-[0.1em] text-cloud">
                    {formatPhoneDisplay(phone)}
                  </span>
                  <span className="mt-1 block text-[11px] text-ash">
                    opens your messages, just hit send
                  </span>
                </a>
              ) : (
                <div className="border border-nyx-line bg-nyx-soft/70 px-6 py-5 text-center text-sm text-ash">
                  Event line not provisioned yet, use web check-in.
                </div>
              )}
              <p className="mt-3 text-center text-xs leading-relaxed text-ash">
                No app to download. Prefer a screen?{" "}
                <Link href="/join" className="text-helio underline-offset-2 hover:underline">
                  check in on the web
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-[2] mx-auto w-full max-w-3xl px-6 pb-20">
        {/* The night, step by step */}
        <section className="py-14">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <span className="crosshair" aria-hidden />
            The night
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud">
            Four moves, all by text
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="group flex gap-4 border border-nyx-line/70 bg-nyx-soft/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-helio/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-nyx-line text-xs tabular-nums text-helio">
                  {i + 1}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-cloud">
                    <step.Icon className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ash group-hover:text-cloud/80">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Your gem */}
        <section className="border-t border-nyx-line/60 py-14">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Your gem
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud">
            Six gems, one color wheel
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            Everyone gets a color gem at check-in. We never say why. Each gem is a hue on the wheel,
            and the first quest is to gather a triangle of three: all primaries, or all secondaries.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {GEM_TRIOS.map((trio) => (
              <div key={trio.label} className="border border-nyx-line/70 bg-nyx-soft/60 p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-cloud">{trio.label}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ash">{trio.hint}</p>
                </div>
                <ul className="mt-4 flex items-stretch gap-2">
                  {trio.ids.map((id) => (
                    <li
                      key={id}
                      className="flex flex-1 flex-col items-center gap-2 border border-nyx-line/70 bg-nyx px-2 py-4"
                    >
                      <GemIcon gem={id} size={32} />
                      <span className="text-xs text-cloud">{GEMS[id].label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* The three quests */}
        <section className="border-t border-nyx-line/60 py-14">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <Target className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            The quests
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud">
            Three quests, one labyrinth
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            Solve them in any order. Text your answers (game IDs, secret words, riddle solutions)
            to {PRODUCT_NAME}, and your points stack live on the room board.
          </p>
          <ol className="mt-8 space-y-3">
            {MISSIONS.map((m, i) => {
              const Icon = QUEST_ICONS[m.id] ?? Target;
              return (
                <li
                  key={m.id}
                  className="group border border-nyx-line/70 bg-nyx-soft/60 p-6 transition-all duration-300 hover:border-helio/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-nyx-line text-xs tabular-nums text-helio">
                        {i + 1}
                      </span>
                      <h3 className="flex items-center gap-2 text-lg text-cloud">
                        <Icon className="h-5 w-5 text-helio" strokeWidth={1.5} aria-hidden />
                        {m.title}
                      </h3>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums tracking-[0.2em] text-helio">
                      {m.points} pts
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ash group-hover:text-cloud/80">
                    {m.promptCopy}
                  </p>
                  <span
                    className={cn(
                      "mt-4 inline-flex w-fit items-center gap-1.5 border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]",
                      m.requiresPartner
                        ? "border-gem-aquamarine/40 text-gem-aquamarine"
                        : "border-nyx-line/70 text-ash",
                    )}
                  >
                    {m.requiresPartner ? <Users className="h-3 w-3" strokeWidth={1.5} aria-hidden /> : null}
                    {m.requiresPartner ? "needs a partner" : "solo quest"}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Everything by text */}
        <section className="border-t border-nyx-line/60 py-14">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Everything by text
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud">
            Just reply to Ariadne
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            Save Ariadne the first time she texts you, then play all night by reply. No app, no
            logins, just the same thread for missions, drinks, and songs.
          </p>
          <div className="mt-6 border border-nyx-line/70 bg-nyx-soft/60 p-6">
            <TextReminders className="mx-auto max-w-xs" />
          </div>
        </section>

        {/* At the bar */}
        <section className="border-t border-nyx-line/60 py-14">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <Wine className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            At the bar
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud">
            Order a drink, skip the line
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            No line, no tab. Text a drink and Ariadne routes it to the bar, then pings you when it's
            ready at pickup. One signature cocktail is on the house; beer, wine, and zero-proof are
            unlimited all night.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {COCKTAILS.map((d) => (
              <div key={d.id} className="border border-nyx-line/70 bg-nyx px-3 py-4 text-center">
                <p className="text-sm text-cloud">{d.label}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-helio">on the house</p>
              </div>
            ))}
          </div>
        </section>

        {/* On the board */}
        <section className="border-t border-nyx-line/60 py-14">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            On the board
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud">
            The whole room, on one board
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            Every gem, score, and solve lands on the live projection down the runway. The night moves
            through these stages:
          </p>
          <ol className="mt-6 grid gap-2 sm:grid-cols-2">
            {SCENES.map((s, i) => (
              <li key={s.id} className="border border-nyx-line/70 bg-nyx-soft/60 p-4">
                <span className="text-xs tabular-nums tracking-[0.2em] text-ash">0{i + 1}</span>
                <p className="mt-2 text-sm text-cloud">{s.headline}</p>
                <p className="mt-1 text-sm leading-relaxed text-ash">{s.tagline}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Closing call to action */}
        <section className="border-t border-nyx-line/60 py-14 text-center">
          <h2 className="font-display text-3xl font-extralight tracking-tight text-cloud">
            Ready to run the labyrinth?
          </h2>
          <p className="mt-3 text-sm text-ash">Check in, grab your gem, and start solving.</p>
          <Link
            href="/join"
            className="group mt-6 inline-flex items-center gap-2 border border-helio/50 bg-helio/15 px-6 py-3 text-sm text-cloud transition-colors hover:bg-helio/25"
          >
            <QrCode className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
            Join now
            <ArrowRight
              className="h-4 w-4 text-helio transition-transform group-hover:translate-x-1"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
          <footer className="mt-10 flex flex-wrap items-center justify-center gap-4 border-t border-nyx-line pt-6 text-xs uppercase tracking-[0.2em] text-ash">
            <Link href="/projection" className="hover:text-cloud">
              live board
            </Link>
            <Link href="/" className="hover:text-cloud">
              home
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
