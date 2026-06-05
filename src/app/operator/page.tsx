"use client";

import {
  Clapperboard,
  Disc3,
  LayoutGrid,
  LogOut,
  Music,
  SlidersHorizontal,
  Sparkles,
  Tablet,
  Target,
  Users,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EVENT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { OperatorGate } from "@/components/operator-gate";
import { AlertsPanel } from "@/app/operator/alerts-panel";
import { AnnouncementsPanel } from "@/app/operator/announcements-panel";
import { Attendees } from "@/app/operator/attendees";
import { ConnectionBanner } from "@/app/operator/connection-banner";
import { ConsoleTabs, type ConsoleTab } from "@/app/operator/console-tabs";
import { DrinkQueue } from "@/app/operator/drink-queue";
import { GameProgress } from "@/app/operator/game-progress";
import { ProjectionControls } from "@/app/operator/projection-controls";
import { Roster } from "@/app/operator/roster";
import { SongsPanel } from "@/app/operator/songs-panel";
import { StatsRail } from "@/app/operator/stats-rail";
import { useOperatorToken } from "@/app/operator/use-operator-token";

/** The surfaces the console drives, shown on the locked gate so staff know what they're opening. */
const CONSOLE_SURFACES: { Icon: LucideIcon; label: string }[] = [
  { Icon: Wine, label: "Bar queue" },
  { Icon: Disc3, label: "DJ requests" },
  { Icon: Sparkles, label: "Stage visuals" },
  { Icon: LayoutGrid, label: "Live board" },
];

type TabId = "bar" | "music" | "show" | "game" | "guests";

const TABS: ConsoleTab<TabId>[] = [
  { id: "bar", label: "Bar", Icon: Wine },
  { id: "music", label: "Music", Icon: Music },
  { id: "show", label: "Show", Icon: Clapperboard },
  { id: "game", label: "Game", Icon: Target },
  { id: "guests", label: "Guests", Icon: Users },
];

/** External displays staff pop open on their own screens; each persists its own token. */
const DISPLAYS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/bar", label: "bar", Icon: Tablet },
  { href: "/dj", label: "dj", Icon: Disc3 },
  { href: "/visuals", label: "stage", Icon: Sparkles },
  { href: "/projection", label: "board", Icon: LayoutGrid },
];

export default function OperatorPage() {
  const { token, input, setInput, unlock, lock } = useOperatorToken();
  const [tab, setTab] = useState<TabId>("bar");

  if (!token) {
    return (
      <main className="relative flex min-h-dvh flex-1 flex-col bg-nyx px-6 py-8 scanlines">
        <div className="relative z-[2] flex flex-1 items-center justify-center py-8">
          <OperatorGate
            title="Staff console"
            Icon={SlidersHorizontal}
            description="Run-of-show, drinks, songs, and the live roster: the whole night from one screen. Paste your operator token to unlock the console."
            value={input}
            onChange={setInput}
            onUnlock={unlock}
          >
            <div>
              <p className="text-center text-[11px] uppercase tracking-[0.25em] text-helio">
                what you&apos;ll run
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {CONSOLE_SURFACES.map((s) => (
                  <li
                    key={s.label}
                    className="flex items-center gap-2 border border-nyx-line/70 bg-nyx px-3 py-2 text-xs text-cloud"
                  >
                    <s.Icon className="h-3.5 w-3.5 shrink-0 text-helio" strokeWidth={1.5} aria-hidden />
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>
          </OperatorGate>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh flex-1 bg-nyx px-4 py-6 scanlines sm:px-6 lg:px-10">
      <div className="relative z-[2] mx-auto w-full max-w-[1600px]">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-5">
          <div className="flex items-center gap-3">
            <LabyrinthThread size={30} />
            <div>
              <h1 className="font-display text-xl font-extralight tracking-tight text-cloud">
                Staff console
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-ash">{EVENT_NAME} · run of show</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DISPLAYS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                target="_blank"
                className="flex items-center gap-1.5 border border-nyx-line px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-ash transition-colors hover:border-helio/50 hover:text-cloud"
              >
                <d.Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {d.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={lock}
              className="flex items-center gap-1.5 border border-transparent px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-ash transition-colors hover:text-cloud"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              lock
            </button>
          </div>
        </header>

        {/* Always-on room status: auth health, the live snapshot, and open alerts. */}
        <div className="space-y-4">
          <ConnectionBanner token={token} />
          <StatsRail />
          <AlertsPanel token={token} />
        </div>

        <div className="mt-5">
          <ConsoleTabs tabs={TABS} active={tab} onSelect={setTab} />
          <div className="mt-5">
            {tab === "bar" ? <DrinkQueue token={token} /> : null}
            {tab === "music" ? <SongsPanel token={token} /> : null}
            {tab === "show" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <ProjectionControls token={token} />
                <AnnouncementsPanel token={token} />
              </div>
            ) : null}
            {tab === "game" ? <GameProgress token={token} /> : null}
            {tab === "guests" ? (
              <div className="space-y-4">
                <Attendees token={token} />
                <Roster token={token} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
