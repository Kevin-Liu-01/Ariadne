import { BookOpen, LayoutGrid, MessageSquare, Target, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { MISSIONS } from "@/constants/missions";
import { GemIcon } from "@/components/gem-icon";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { SiteNav } from "@/components/site-nav";
import { env } from "@/lib/env";

const STEPS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: MessageSquare,
    title: "Text to check in",
    body: "Text the event line. Ariadne threads you in with a color gem, a secret word, and your four-letter game ID.",
  },
  {
    Icon: Target,
    title: "Run the labyrinth",
    body: "Solve missions by text: match gem colors, complete secret phrases, crack riddles, and decode the big screen.",
  },
  {
    Icon: Wine,
    title: "Order by text",
    body: "Name any drink on the menu. Ariadne routes it to the bar and texts you when it is ready at pickup.",
  },
  {
    Icon: LayoutGrid,
    title: "Watch the board",
    body: "The room projection shows live scores and gems. Climb the ranks, solve together, and do not fade out.",
  },
];

export default function PlayPage() {
  const phone = env.agentphone.phoneNumber;

  return (
    <main className="relative min-h-screen bg-nyx px-10 py-10 scanlines">
      <div className="relative z-[2] mx-auto w-full max-w-3xl animate-rise">
        <SiteNav className="mb-8 justify-center" />
        <div className="flex justify-center">
          <LabyrinthThread size={72} animate />
        </div>
        <p className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-ash">
          {EVENT_NAME} · {VENUE}
        </p>
        <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight">How to play</h1>
        <p className="mt-2 text-center text-sm text-helio">{PRODUCT_TAGLINE}</p>

        <section className="mt-10 border border-nyx-line bg-nyx-soft/90 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-ash">event line</p>
          <p className="mt-2 text-2xl tabular-nums tracking-wide text-cloud">{phone}</p>
          <p className="mt-3 text-sm leading-relaxed text-ash">
            Text <span className="text-cloud">{PRODUCT_NAME}</span> to join. You can also{" "}
            <Link href="/join" className="text-helio underline-offset-2 hover:underline">
              check in on the web
            </Link>
            .
          </p>
        </section>

        <ol className="mt-10 space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 border border-nyx-line bg-nyx-soft/80 p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-nyx-line text-xs tabular-nums text-helio">
                {i + 1}
              </span>
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-cloud">
                  <step.Icon className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
                  {step.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ash">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
            <BookOpen className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            your gem
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ash">
            Every guest gets one of six color gems at check-in. Your gem is your team color on the
            projection board and the key to the first mission.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.values(GEMS).map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-2 border border-nyx-line bg-nyx px-3 py-2 text-sm text-cloud"
              >
                <GemIcon gem={g.id} size={18} />
                {g.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm uppercase tracking-[0.25em] text-helio">missions</h2>
          <p className="mt-2 text-sm leading-relaxed text-ash">
            Missions arrive by text. Reply to {PRODUCT_NAME} with answers, partner game IDs, or
            phrases. Points stack on the live board.
          </p>
          <ul className="mt-4 space-y-3">
            {MISSIONS.map((m) => (
              <li key={m.id} className="border border-nyx-line bg-nyx-soft/80 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-cloud">{m.title}</p>
                  <span className="text-xs tabular-nums text-helio">{m.points} pts</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ash">{m.promptCopy}</p>
                {m.requiresPartner ? (
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-gem-aquamarine">
                    needs a partner in the room
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-center gap-4 border-t border-nyx-line pt-6 text-xs uppercase tracking-[0.2em] text-ash">
          <Link href="/join" className="text-helio hover:text-cloud">
            join now
          </Link>
          <Link href="/projection" className="hover:text-cloud">
            live board
          </Link>
          <Link href="/" className="hover:text-cloud">
            home
          </Link>
        </footer>
      </div>
    </main>
  );
}
