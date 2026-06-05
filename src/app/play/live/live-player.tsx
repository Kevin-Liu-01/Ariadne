"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { ShaderBackdrop } from "@/components/shader-backdrop";
import { cn } from "@/lib/utils";
import { type ActionResponse } from "./actions";
import type { ActFn } from "./game-console";
import { LiveStage } from "./live-stages";
import { usePlayer } from "./use-player";

/** Ambient look per scene, faint behind the live game so taps stay legible, bold when cinematic. */
const SCENE_BACKDROP: Record<string, { scene: string; className: string }> = {
  arrival: { scene: "Soft Register", className: "opacity-[0.22]" },
  opening: { scene: "Fluid Chrome", className: "opacity-[0.2]" },
  game: { scene: "Soft Register", className: "opacity-[0.08]" },
  finale: { scene: "Spectral Bloom", className: "opacity-[0.16]" },
  runway: { scene: "Dedalus Bloom", className: "opacity-[0.26]" },
};

/** The authenticated Live Player: polls room state and runs tap actions with a toast. */
export function LivePlayer({ token, onExpire }: { token: string; onExpire: () => void }) {
  const { view, error, loading, expired, refresh } = usePlayer(token);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (expired) onExpire();
  }, [expired, onExpire]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const act = useCallback<ActFn>(
    async (run): Promise<ActionResponse> => {
      setBusy(true);
      try {
        const res = await run();
        showToast(res.say);
        await refresh();
        return res;
      } finally {
        setBusy(false);
      }
    },
    [refresh, showToast],
  );

  const backdrop = view ? (SCENE_BACKDROP[view.scene] ?? SCENE_BACKDROP.arrival) : SCENE_BACKDROP.arrival;
  const cinematic = !view || view.scene !== "game";

  return (
    <main className="relative flex min-h-dvh flex-col bg-nyx px-5 py-6 scanlines">
      <ShaderBackdrop sceneName={backdrop.scene} className={backdrop.className} />

      <div
        className={cn(
          "relative z-[2] flex flex-1 flex-col items-center py-4",
          cinematic ? "justify-center" : "justify-start",
        )}
      >
        {!view && loading ? (
          <div className="flex flex-col items-center gap-4 text-ash">
            <LabyrinthThread size={64} animate />
            <p className="animate-pulse-slow text-xs uppercase tracking-[0.3em]">finding your thread...</p>
          </div>
        ) : view ? (
          <LiveStage view={view} act={act} busy={busy} />
        ) : (
          <p className="text-sm text-ash">{error ?? "Couldn't load the game."}</p>
        )}
      </div>

      {error && view ? (
        <p className="pointer-events-none absolute right-4 top-4 z-[3] text-[10px] uppercase tracking-[0.2em] text-gem-garnet">
          {error}
        </p>
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[4] flex justify-center px-5 pb-6">
          <div className="animate-rise max-w-md border border-helio/50 bg-nyx-soft/95 px-5 py-3.5 text-center text-sm leading-relaxed text-cloud shadow-[0_0_40px_rgba(210,190,255,0.18)]">
            {toast}
          </div>
        </div>
      ) : null}
    </main>
  );
}
