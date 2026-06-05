"use client";

import { Disc3, LayoutGrid, LogOut, SlidersHorizontal, Sparkles, Tablet, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { OperatorGate } from "@/components/operator-gate";
import { SiteNav } from "@/components/site-nav";
import { AlertsPanel } from "@/app/operator/alerts-panel";
import { AnnouncementsPanel } from "@/app/operator/announcements-panel";
import { ConnectionBanner } from "@/app/operator/connection-banner";
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

export default function OperatorPage() {
  const { token, input, setInput, unlock, lock } = useOperatorToken();

  if (!token) {
    return (
      <main className="relative flex min-h-dvh flex-1 flex-col bg-nyx px-6 py-8 scanlines">
        <SiteNav className="relative z-[2] justify-center" />
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
    <main className="relative min-h-dvh flex-1 bg-nyx px-10 py-8 scanlines">
      <div className="relative z-[2] mx-auto w-full max-w-[1600px]">
        <header className="border-b border-nyx-line pb-4">
          <SiteNav
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/bar"
                  target="_blank"
                  className="flex items-center gap-1.5 border border-nyx-line px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-ash transition-colors hover:border-helio/50 hover:text-cloud"
                >
                  <Tablet className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  bar
                </Link>
                <Link
                  href="/dj"
                  target="_blank"
                  className="flex items-center gap-1.5 border border-nyx-line px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-ash transition-colors hover:border-helio/50 hover:text-cloud"
                >
                  <Disc3 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  dj
                </Link>
                <Link
                  href="/visuals"
                  target="_blank"
                  className="flex items-center gap-1.5 border border-nyx-line px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-ash transition-colors hover:border-helio/50 hover:text-cloud"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  stage
                </Link>
                <button
                  type="button"
                  onClick={lock}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-ash transition-colors hover:text-cloud"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  lock
                </button>
              </div>
            }
          />
        </header>

        <div className="mt-5 space-y-4">
          <ConnectionBanner token={token} />
          <StatsRail />
          <AlertsPanel token={token} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <AnnouncementsPanel token={token} />
          <SongsPanel token={token} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <DrinkQueue token={token} />
          <GameProgress token={token} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ProjectionControls token={token} />
          <Roster token={token} />
        </div>
      </div>
    </main>
  );
}
