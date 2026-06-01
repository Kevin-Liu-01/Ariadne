"use client";

import { Lock, LogOut } from "lucide-react";
import { PRODUCT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { SiteNav } from "@/components/site-nav";
import { AlertsPanel } from "@/app/operator/alerts-panel";
import { ConnectionBanner } from "@/app/operator/connection-banner";
import { DrinkQueue } from "@/app/operator/drink-queue";
import { GameProgress } from "@/app/operator/game-progress";
import { ProjectionControls } from "@/app/operator/projection-controls";
import { Roster } from "@/app/operator/roster";
import { StatsRail } from "@/app/operator/stats-rail";
import { useOperatorToken } from "@/app/operator/use-operator-token";

export default function OperatorPage() {
  const { token, input, setInput, unlock, lock } = useOperatorToken();

  if (!token) {
    return (
      <main className="relative flex flex-1 items-center justify-center bg-nyx px-10 scanlines">
        <div className="relative z-[2] w-full max-w-sm animate-rise">
          <SiteNav className="mb-6 justify-center" />
          <div className="border border-nyx-line bg-nyx-soft p-6">
          <div className="mb-4 flex justify-center">
            <LabyrinthThread size={60} />
          </div>
          <h1 className="flex items-center justify-center gap-2 text-lg font-semibold">
            <Lock className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
            {PRODUCT_NAME} · operator
          </h1>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock()}
            type="password"
            placeholder="operator token"
            className="mt-4 w-full border border-nyx-line bg-nyx px-4 py-3 text-cloud outline-none focus:border-helio/50"
          />
          <button
            type="button"
            onClick={unlock}
            className="mt-3 w-full bg-helio px-4 py-3 font-medium uppercase tracking-wide text-nyx"
          >
            unlock
          </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex-1 bg-nyx px-10 py-8 scanlines">
      <div className="relative z-[2] mx-auto w-full max-w-[1600px]">
        <header className="flex flex-col gap-4 border-b border-nyx-line pb-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <LabyrinthThread size={40} />
              {PRODUCT_NAME} · operator
            </h1>
            <button
              type="button"
              onClick={lock}
              className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-ash hover:text-cloud"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              lock
            </button>
          </div>
          <SiteNav />
        </header>

        <div className="mt-5 space-y-4">
          <ConnectionBanner token={token} />
          <StatsRail />
          <AlertsPanel token={token} />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
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
