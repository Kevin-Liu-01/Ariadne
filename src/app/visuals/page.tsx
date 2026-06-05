"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { EVENT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { AudioEngine } from "@/app/visuals/audio";

// Pixi/WebGPU touch the DOM, so the shader stage is client-only (no SSR).
const Stage = dynamic(() => import("@/app/visuals/stage").then((m) => m.Stage), { ssr: false });

/**
 * Venue ambient screen. The Mac's mic feeds a Web Audio analyser; the shaders.com
 * scenes paint the room and react to the music, crossfading on a timer. We gate on a
 * click so the browser grants mic + audio context, then hand the live engine to the
 * GPU stage.
 */
export default function VisualsPage() {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);

  const begin = useCallback(async () => {
    setError(null);
    const engine = new AudioEngine();
    try {
      await engine.start();
    } catch {
      setError("I need the mic to feel the room. Allow microphone access, then start again.");
      return;
    }
    engineRef.current = engine;
    setStarted(true);
  }, []);

  if (started && engineRef.current) {
    return <Stage engine={engineRef.current} />;
  }

  return (
    <main className="relative flex h-dvh flex-col items-center justify-center bg-nyx px-6 text-center scanlines">
      <div className="relative z-[2] flex max-w-md flex-col items-center animate-rise">
        <LabyrinthThread size={92} animate />
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-helio">{EVENT_NAME}</p>
        <h1 className="mt-3 font-display text-5xl font-extralight tracking-tight text-cloud">Stage visuals</h1>
        <p className="mt-3 text-sm leading-relaxed text-ash">
          Point this screen at the room and let the Mac hear the music. The scenes breathe with the
          sound and crossfade on their own.
        </p>
        <button
          type="button"
          onClick={() => void begin()}
          className="mt-8 flex items-center gap-2 bg-helio px-7 py-3 text-sm font-semibold uppercase tracking-widest text-nyx transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
          Start the visuals
        </button>
        {error ? <p className="mt-4 text-sm text-gem-garnet">{error}</p> : null}
        <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-ash/60">turn the volume up. mic on.</p>
      </div>
    </main>
  );
}
