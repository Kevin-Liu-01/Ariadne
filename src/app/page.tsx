import { ArrowRight, BookOpen, Disc3, KeyRound, LayoutGrid, MessageSquare, MonitorPlay, Music, Palette, Puzzle, SlidersHorizontal, Target, Users, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { DRINK_MENU, type MenuItem } from "@/constants/drinks";
import { PRODUCT_NAME, VENUE } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { MISSIONS } from "@/constants/missions";
import { SCENES } from "@/constants/scenes";
import { textableAction } from "@/constants/textable-actions";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { RunwayWordmark } from "@/components/runway-wordmark";
import { TextReminders } from "@/components/text-reminders";
import { IMessageLink } from "@/components/imessage-link";
import { JoinCta } from "@/components/join-cta";
import { HeroBentoLeft, HeroBentoRight } from "@/components/hero-bento-walls";
import { GemIcon } from "@/components/gem-icon";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface NavLink {
  href: string;
  label: string;
  Icon: LucideIcon;
}

/** Secondary destinations. The primary "Join" check-in CTA is its own component. */
const LINKS: NavLink[] = [
  { href: "/play", label: "How to play", Icon: BookOpen },
  { href: "/projection", label: "Live board", Icon: LayoutGrid },
  { href: "/operator", label: "Staff", Icon: SlidersHorizontal },
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

/** Marketing presentation for each quest, keyed to the mission id so titles and
 *  points stay sourced from the canonical MISSIONS catalog. */
const QUEST_PRESENTATION: Record<string, { Icon: LucideIcon; blurb: string }> = {
  "color-constellation": {
    Icon: Palette,
    blurb:
      "Your gem is a hue on the color wheel. Find two more guests whose colors complete a triangle, all primaries or all secondaries.",
  },
  "word-thread": {
    Icon: Users,
    blurb:
      "You carry half of a hidden phrase. Track down the guest holding the other half, then text in their game ID.",
  },
  "riddle-labyrinth": {
    Icon: Puzzle,
    blurb:
      "Three riddles, each a systems term hiding a second, everyday meaning. Crack all three to clear the maze.",
  },
};

const COCKTAILS: MenuItem[] = DRINK_MENU.filter((d) => d.category === "cocktail" && d.available);

export default function Home() {
  const phone = env.agentphone.phoneNumber;
  return (
    <main className="flex flex-col">
      {/* Hero: photo bento walls flanking the wordmark */}
      <section className="grid min-h-dvh grid-cols-1 gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
        <HeroBentoLeft />

        <section className="bgimg-nyx-waves relative flex flex-col items-center justify-center overflow-hidden border border-nyx-line/70 px-6 py-20 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-nyx/75 via-nyx/40 to-nyx/85" />
          <div className="scanlines absolute inset-0" />
          <div
            className="pointer-events-none absolute left-1/2 top-[32%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-helio/20 blur-[100px]"
            aria-hidden
          />

          <div className="relative z-[3] flex w-full max-w-md flex-col items-center animate-rise">
            <LabyrinthThread size={132} animate />

            <h1 className="mt-6 font-display text-7xl font-extralight leading-[0.95] tracking-tight text-cloud sm:text-8xl">
              {PRODUCT_NAME}
            </h1>

            <div className="mt-5 flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-helio/50" aria-hidden />
              <span className="text-[11px] uppercase tracking-[0.4em] text-ash">your personal agent for</span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-helio/50" aria-hidden />
            </div>
            <RunwayWordmark size="md" className="mt-2" />

            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ash">
              A one-night runway experience at {VENUE}, presented by Dedalus Labs. Text {PRODUCT_NAME}{" "}
              to check in, get a color gem and a secret word, work through the labyrinth of missions,
              and order drinks, all from your phone.
            </p>

            <nav className="mt-10 w-full">
              <JoinCta />
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {LINKS.map((l) => (
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
          </div>

          <p className="absolute inset-x-0 bottom-6 z-[3] flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.25em] text-ash/60">
            <span className="crosshair" aria-hidden />
            scroll for how the night works
          </p>
        </section>

        <HeroBentoRight />
      </section>

      {/* How the night works */}
      <section className="border-t border-nyx-line/60 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <span className="crosshair" aria-hidden />
            The night
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

          <div className="mt-3 border border-nyx-line/70 bg-nyx-soft/60 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <h3 className="font-display text-2xl font-extralight tracking-tight text-cloud">
                Everything happens by text
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-ash">
                No app to download. Save Ariadne the first time she texts you, then just reply to
                play all night.
              </p>
            </div>
            <TextReminders phone={phone} className="mt-6 w-full max-w-xs sm:mt-0" />
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
            wheel; find two more guests so your three colors form a triangle, all primaries or all
            secondaries, to solve the constellation.
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

      {/* The quests */}
      <section className="border-t border-nyx-line/60 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <Target className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            The quests
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud sm:text-5xl">
            Three quests, one labyrinth
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            Solve them in any order, entirely by text. Points stack live on the room board, and the
            fastest, most social players rise to the top.
          </p>
          <IMessageLink
            phone={phone}
            body={textableAction("missions").body}
            iconSize={16}
            className="mt-5 inline-flex items-center gap-2 border border-nyx-line/70 bg-nyx-soft/60 px-3 py-2 text-xs text-ash hover:border-helio/50"
          >
            Text your answers to Ariadne, no app required.
          </IMessageLink>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {MISSIONS.map((m) => {
              const q = QUEST_PRESENTATION[m.id];
              if (!q) return null;
              return (
                <div
                  key={m.id}
                  className="group flex flex-col border border-nyx-line/70 bg-nyx-soft/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-helio/40"
                >
                  <div className="flex items-center justify-between">
                    <q.Icon className="h-6 w-6 text-helio" strokeWidth={1.5} aria-hidden />
                    <span className="text-xs tabular-nums tracking-[0.2em] text-helio">{m.points} pts</span>
                  </div>
                  <h3 className="mt-4 text-lg text-cloud">{m.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ash group-hover:text-cloud/80">
                    {q.blurb}
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
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The bar + the booth */}
      <section className="border-t border-nyx-line/60 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <Wine className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            The bar + the booth
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud sm:text-5xl">
            Order a drink, request a song
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            No line, no tab. Text Ariadne and she routes it: one signature cocktail on the house,
            with beer, wine, and zero-proof unlimited all night.
          </p>
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            <div className="border border-nyx-line/70 bg-nyx-soft/60 p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <IMessageLink
                  phone={phone}
                  body={textableAction("drinks").body}
                  iconSize={18}
                  className="inline-flex items-center gap-2 text-sm text-cloud"
                >
                  ask for drinks
                </IMessageLink>
                <span className="text-[10px] uppercase tracking-[0.2em] text-helio">
                  one cocktail on the house
                </span>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {COCKTAILS.map((d) => (
                  <div key={d.id} className="border border-nyx-line/70 bg-nyx px-3 py-4 text-center">
                    <p className="text-sm text-cloud">{d.label}</p>
                    {d.ingredients ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-ash">{d.ingredients}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ash">
                Beer, wine, and zero-proof drinks are free and unlimited. Ariadne pings you the moment
                your order is ready at pickup.
              </p>
            </div>
            <div className="flex flex-col border border-nyx-line/70 bg-nyx-soft/60 p-6">
              <IMessageLink
                phone={phone}
                body={textableAction("songs").body}
                iconSize={18}
                className="inline-flex items-center gap-2 text-sm text-cloud"
              >
                request songs
              </IMessageLink>
              <h3 className="mt-4 flex items-center gap-2 text-lg text-cloud">
                <Disc3 className="h-5 w-5 text-helio" strokeWidth={1.5} aria-hidden />
                Feed the booth
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ash">
                Text a track and Ariadne drops it in the DJ queue. The booth pulls live requests
                straight from the room.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-helio">
                <Music className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                live DJ queue
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The room / live board */}
      <section className="border-t border-nyx-line/60 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-helio">
            <MonitorPlay className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            The room
          </p>
          <h2 className="mt-3 font-display text-4xl font-extralight tracking-tight text-cloud sm:text-5xl">
            The whole room, on one board
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            Every gem, score, and solve lands on a live projection down the runway. The night moves
            through four stages, and you can watch it climb in real time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {SCENES.map((s, i) => (
              <div
                key={s.id}
                className="w-full border border-nyx-line/70 bg-nyx-soft/60 p-5 sm:w-[calc(50%-0.375rem)] lg:w-[calc(20%-0.6rem)]"
              >
                <span className="text-xs tabular-nums tracking-[0.2em] text-ash">0{i + 1}</span>
                <h3 className="mt-3 text-base text-cloud">{s.headline}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ash">{s.tagline}</p>
              </div>
            ))}
          </div>
          <Link
            href="/projection"
            className="group mt-6 inline-flex items-center gap-2 border border-helio/50 bg-helio/10 px-5 py-3 text-sm text-cloud transition-colors hover:bg-helio/20"
          >
            <LayoutGrid className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
            Open the live board
            <ArrowRight
              className="h-4 w-4 text-helio transition-transform group-hover:translate-x-1"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </div>
      </section>

      <footer className="border-t border-nyx-line/60 px-6 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-ash/60">Dedalus · give your agent wings 🪽</p>
      </footer>
    </main>
  );
}
