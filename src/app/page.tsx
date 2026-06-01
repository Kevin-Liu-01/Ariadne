import { KeyRound, LayoutGrid, MessageSquare, QrCode, SlidersHorizontal, Target, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { BentoCell } from "@/components/bento-cell";
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
    body: "Text the event line. Ariadne threads you in with a color gem, a secret word, and your game ID.",
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
      {/* Hero: cloud bento walls flanking the wordmark */}
      <section className="grid min-h-screen grid-cols-1 gap-2 p-2 lg:h-screen lg:grid-cols-[1fr_1.5fr_1fr]">
        <div className="hidden grid-cols-2 grid-rows-6 gap-2 lg:grid">
          <BentoCell bg="bgimg-nyx-lines" label="NYX // LINES" className="col-span-2 row-span-2" />
          <BentoCell bg="bgimg-cloud-sky" label="CLOUD" tone="veil" className="row-span-2" />
          <BentoCell bg="bgimg-hero-smoke" label="SMOKE" className="row-span-2" />
          <BentoCell bg="bgimg-cloud-lines" label="CIRRUS" tone="veil" className="col-span-2 row-span-2" />
        </div>

        <section className="bgimg-nyx-waves reticle reticle-strong relative flex flex-col items-center justify-center overflow-hidden border border-nyx-line/70 px-6 py-16 text-center">
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

            <nav className="mt-10 grid w-full gap-2">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "reticle group block border px-5 py-3 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5",
                    l.primary
                      ? "reticle-strong border-helio/50 bg-helio/10 hover:bg-helio/15"
                      : "border-nyx-line/70 bg-nyx/60 hover:border-helio/50 hover:bg-nyx/40",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <l.Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          l.primary ? "text-helio" : "text-ash group-hover:text-helio",
                        )}
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <span className="text-base text-cloud">{l.label}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-ash group-hover:text-helio">
                      {l.note}
                    </span>
                  </span>
                  <p className="mt-1.5 text-xs text-ash group-hover:text-cloud/80">{l.hint}</p>
                </Link>
              ))}
            </nav>

            <p className="mt-10 flex items-center gap-2 text-xs text-ash/60">
              <span className="crosshair" aria-hidden />
              Scroll for how the night works
            </p>
          </div>
        </section>

        <div className="hidden grid-cols-2 grid-rows-6 gap-2 lg:grid">
          <BentoCell bg="bgimg-hero-sky" label="RUN(WAY)TIME" tone="veil" className="col-span-2 row-span-3" />
          <BentoCell bg="bgimg-nyx-waves" label="NYX // WAVE" className="row-span-3" />
          <BentoCell bg="bgimg-cloud-sky" label="HELIO" tone="veil" className="row-span-3" />
        </div>
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
                className="reticle group border border-nyx-line/70 bg-nyx-soft/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-helio/40"
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
            Everyone is threaded a color at check-in. We never say why. Find the colors that complete
            yours: a matched pair, or two that mix into a third, to solve the constellation.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.values(GEMS).map((gem) => (
              <div
                key={gem.id}
                className="reticle group flex flex-col items-center gap-3 border border-nyx-line/70 bg-nyx-soft/60 px-3 py-6 transition-all duration-300 hover:-translate-y-1 hover:border-helio/40"
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
