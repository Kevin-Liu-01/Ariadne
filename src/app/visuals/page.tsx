"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { AudioEngine } from "@/app/visuals/audio";

// Pixi/WebGPU touch the DOM, so the shader stage is client-only (no SSR).
const Stage = dynamic(() => import("@/app/visuals/stage").then((m) => m.Stage), { ssr: false });

/**
 * Venue ambient screen. The shaders.com scenes paint the room and crossfade on a timer
 * on their own; when the browser grants the mic they also breathe with the music. There
 * is no start screen: we open the engine on mount and, if the browser withholds audio
 * until a gesture, unlock it on the first tap or key, so the board just plays.
 */
export default function VisualsPage() {
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();
  const engine = engineRef.current;

  useEffect(() => {
    let disposed = false;
    let state: "idle" | "starting" | "on" = "idle";
    const tryStart = async () => {
      if (disposed || state !== "idle") return;
      state = "starting";
      try {
        await engine.start();
        if (disposed) {
          engine.stop();
          return;
        }
        state = "on";
      } catch {
        // Mic blocked until a gesture (or denied), so the scenes still run, just unreactive.
        state = "idle";
      }
    };
    void tryStart();
    const onGesture = () => void tryStart();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      disposed = true;
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      engine.stop();
    };
  }, [engine]);

  return <Stage engine={engine} />;
}
