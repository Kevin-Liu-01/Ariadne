"use client";

import { Lock, LogOut } from "lucide-react";
import { PRODUCT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { AlertsPanel } from "@/app/operator/alerts-panel";
import { ConnectionBanner } from "@/app/operator/connection-banner";
import { DrinkQueue } from "@/app/operator/drink-queue";
import { ProjectionControls } from "@/app/operator/projection-controls";
import { Roster } from "@/app/operator/roster";
import { useOperatorToken } from "@/app/operator/use-operator-token";

export default function OperatorPage() {
  const { token, input, setInput, unlock, lock } = useOperatorToken();

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="reticle reticle-strong w-full max-w-sm border border-nyx-line bg-nyx-soft p-6 animate-rise">
          <div className="mb-4 flex justify-center">
            <LabyrinthThread size={60} />
          </div>
          <h1 className="flex items-center justify-center gap-2 text-lg font-semibold">
            <Lock className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
            {PRODUCT_NAME} · operator
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-ash">
            Staff console: bar queue, run-of-show, roster, and guest alerts. Paste the production
            token from Vercel env <span className="text-cloud">ARIADNE_OPERATOR_TOKEN</span>, or open
            a staff link with <span className="text-cloud">?token=...</span> on this URL.
          </p>
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
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <LabyrinthThread size={36} />
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
      </header>
      <ConnectionBanner token={token} />
      <div className="mt-2">
        <AlertsPanel token={token} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DrinkQueue token={token} />
        <ProjectionControls token={token} />
      </div>
      <div className="mt-4">
        <Roster token={token} />
      </div>
    </main>
  );
}
