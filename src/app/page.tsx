import { ArrowRight, BookOpen, KeyRound, LayoutGrid, MessageSquare, QrCode, SlidersHorizontal, Target, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { HeroBentoLeft, HeroBentoRight } from "@/components/hero-bento-walls";
import { GemIcon } from "@/components/gem-icon";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  note: string;
  Icon: LucideIcon;
  hint: string;
  primary?: boolean;
}

const LINKS: NavLink[] = [
  {
    href: "/join",
    label: "Join",
    note: "start here · check in",
    Icon: QrCode,
    primary: true,
    hint: "Text or web check-in: get your gem and first mission.",
  },
  {
    href: "/sms",
    label: "Save contact",
    note: "text Ariadne",
    Icon: MessageSquare,
    hint: "Add Ariadne to your phone so our texts show with a name and photo.",
  },
  {
    href: "/play",
    label: "How to play",
    note: "rules + missions",
    Icon: BookOpen,
    hint: "Gems, missions, drinks, and how the labyrinth works.",
  },
  {
    href: "/projection",
    label: "Live board",
    note: "room display",
    Icon: LayoutGrid,
    hint: "Scores and gems for everyone in the room.",
  },
  {
    href: "/operator",
    label: "Staff",
    note: "bar + show control",
    Icon: SlidersHorizontal,
    hint: "Bartenders and run-of-show: token required.",
  },
];

const STEPS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: MessageSquare,
    title: "Text to check in",
    body: "Text the event line. Ariadne checks you in with a color gem, a secret word, and your game ID.",
  },
  {
    Icon: Target,
    title: "Run the labyrinth",
    body: "Solve missions: match gem colors, complete secret phrases, crack riddles, and decode the screen.",
  },
  {
    Icon: Wine,
    title: "Order by text",
    body: "Just name a drink. Ariadne routes it to the bar and pings you the moment it's ready.",
  },
  {
    Icon: LayoutGrid,
    title: "Watch the board",
    body: "The room fills a live projection. Climb the ranks, solve together, and don't fade out.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col">
      {/* Hero: photo bento walls flanking the wordmark */}
      <section className="grid min-h-dvh grid-cols-1 gap-2 p-2 lg:h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
        <HeroBentoLeft />

        <section className="bgimg-nyx-waves relative flex flex-col items-center justify-center overflow-hidden border border-nyx-line/70 px-6 py-16 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-nyx/75 via-nyx/40 to-nyx/85" />
          <div className="scanlines absolute inset-0" />

          <div className="relative z-[3] flex w-full max-w-md flex-col items-center animate-rise">
            <LabyrinthThread size={150} animate />

            <h1 className="mt-7 font-display text-7xl font-extralight tracking-tight text-cloud sm:text-8xl">
              {PRODUCT_NAME}
            </h1>
            <p className="mt-3 text-sm uppercase tracking-[0.35em] text-helio">{PRODUCT_TAGLINE}</p>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-ash">
              A phone-first game for <span className="text-cloud">{EVENT_NAME}</span> at {VENUE}. Check
              in, get a gem and secret word, solve the labyrinth, and order drinks, all by text.
            </p>

            <nav className="mt-10 w-full">
              {LINKS.filter((l) => l.primary).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex items-center justify-between gap-3 border border-helio/50 bg-helio/15 px-6 py-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-helio/25"
                >
                  <span className="flex items-center gap-3">
                    <l.Icon className="h-6 w-6 text-helio" strokeWidth={1.5} aria-hidden />
                    <span className="text-left">
                      <span className="block text-xl font-medium text-cloud">{l.label}</span>
                      <span className="block text-[11px] uppercase tracking-[0.25em] text-helio">{l.note}</span>
                    </span>
                  </span>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-helio transition-transform group-hover:translate-x-1"
                    strokeWidth={2}
                    aria-hidden
                  />
                </Link>
              ))}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {LINKS.filter((l) => !l.primary).map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group flex items-center gap-2 border border-nyx-line/70 bg-nyx/50 px-4 py-2.5 text-sm text-ash backdrop-blur-sm transition-colors hover:border-helio/50 hover:text-cloud"
                  >
                    <l.Icon className="h-4 w-4 text-ash transition-colors group-hover:text-helio" strokeWidth={1.5} aria-hidden />
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>

            <p className="mt-10 flex items-center gap-2 text-xs text-ash/60">
              <span className="crosshair" aria-hidden />
              Scroll for how the night works
            </p>
          </div>
        </section>

        <HeroBentoRight />
      </section>

      {/* How the night works */}
      <section className="border-t border-nyx-line/60 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <span className="crosshair" aria-hidden />
            The thread
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud sm:text-5xl">
            How the night works
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="group border border-nyx-line/70 bg-nyx-soft/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-helio/40"
              >
                <div className="flex items-center justify-between">
                  <s.Icon className="h-5 w-5 text-helio" strokeWidth={1.5} aria-hidden />
                  <span className="text-xs tabular-nums tracking-[0.2em] text-ash">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base text-cloud">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ash group-hover:text-cloud/80">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The gems */}
      <section className="border-t border-nyx-line/60 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            The gems
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud sm:text-5xl">
            Six gems move through the room
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            Everyone gets a color at check-in. We never say why. Each gem is a hue on the color
            wheel; find three guests whose colors form a triangle, all primaries or all secondaries,
            to solve the constellation.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.values(GEMS).map((gem) => (
              <div
                key={gem.id}
                className="group flex flex-col items-center gap-3 border border-nyx-line/70 bg-nyx-soft/60 px-3 py-6 transition-all duration-300 hover:-translate-y-1 hover:border-helio/40"
              >
                <GemIcon
                  gem={gem.id}
                  size={40}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
                <span className="text-sm text-cloud">{gem.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-nyx-line/60 px-6 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-ash/60">Dedalus · give your agent wings 🪽</p>
      </footer>
    </main>
  );
}
