import Link from "next/link";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { BentoCell } from "@/components/bento-cell";
import { DedalusMark } from "@/components/dedalus-mark";

const LINKS = [
  { href: "/join", label: "Join", note: "guest check-in" },
  { href: "/projection", label: "Projection", note: "the room board" },
  { href: "/operator", label: "Operator", note: "bar + run-of-show" },
];

export default function Home() {
  return (
    <main className="grid min-h-screen grid-cols-1 gap-2 p-2 lg:h-screen lg:grid-cols-[1fr_1.5fr_1fr]">
      {/* Left bento wall: smaller varied cells */}
      <div className="hidden grid-cols-2 grid-rows-6 gap-2 lg:grid">
        <BentoCell bg="bgimg-nyx-lines" label="NYX // LINES" className="col-span-2 row-span-2" />
        <BentoCell bg="bgimg-cloud-sky" label="CLOUD" tone="veil" className="row-span-2" />
        <BentoCell bg="bgimg-hero-smoke" label="SMOKE" className="row-span-2" />
        <BentoCell bg="bgimg-cloud-lines" label="CIRRUS" tone="veil" className="col-span-2 row-span-2" />
      </div>

      {/* Center: nyx cloud hero */}
      <section className="bgimg-nyx-waves reticle reticle-strong relative flex flex-col items-center justify-center overflow-hidden border border-nyx-line/70 px-6 py-16 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-nyx/75 via-nyx/40 to-nyx/85" />
        <div className="scanlines absolute inset-0" />

        <div className="relative z-[3] flex w-full max-w-md flex-col items-center animate-rise">
          <DedalusMark className="h-16 w-16 text-helio drop-shadow-[0_0_26px_rgba(210,190,255,0.55)]" />

          <h1 className="mt-6 font-display text-7xl font-extralight tracking-tight text-cloud sm:text-8xl">
            {PRODUCT_NAME}
          </h1>
          <p className="mt-3 text-sm uppercase tracking-[0.35em] text-helio">{PRODUCT_TAGLINE}</p>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-ash">
            The phone-first event backbone for <span className="text-cloud">{EVENT_NAME}</span> at{" "}
            {VENUE}. Strap it onto a running agent; it threads guests through the labyrinth —
            check-in, gems, missions, drinks, and a live room board.
          </p>

          <nav className="mt-10 grid w-full gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="reticle group flex items-center justify-between border border-nyx-line/70 bg-nyx/60 px-5 py-3 backdrop-blur-sm transition-colors hover:border-helio/50 hover:bg-nyx/40"
              >
                <span className="text-base text-cloud">{l.label}</span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-ash group-hover:text-helio">
                  {l.note}
                </span>
              </Link>
            ))}
          </nav>

          <p className="mt-12 text-xs text-ash/60">Dedalus · give your agent wings</p>
        </div>
      </section>

      {/* Right bento wall: larger varied cells */}
      <div className="hidden grid-cols-2 grid-rows-6 gap-2 lg:grid">
        <BentoCell bg="bgimg-hero-sky" label="RUN(WAY)TIME" tone="veil" className="col-span-2 row-span-3" />
        <BentoCell bg="bgimg-nyx-waves" label="NYX // WAVE" className="row-span-3" />
        <BentoCell bg="bgimg-cloud-sky" label="HELIO" tone="veil" className="row-span-3" />
      </div>
    </main>
  );
}
