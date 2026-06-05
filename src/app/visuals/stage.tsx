"use client";

import { useEffect, useRef, useState } from "react";
import { Shader } from "shaders/react";
import type { AudioEngine } from "@/app/visuals/audio";
import { AudioPointer } from "@/app/visuals/audio-pointer";
import { SCENES, renderScene, type AudioLevels, ZERO_LEVELS } from "@/app/visuals/scenes";

const TRANSITION_MS = 1600; // crossfade length between scenes
const HOLD_MS = 22000; // how long each scene holds before the next crossfade
const EMIT_MS = 24; // audio -> prop cadence (~40fps); the GPU still animates every frame

interface Layer {
  id: number;
  scene: number;
}

/**
 * Drives the shader scenes from the mic and crossfades between them on a timer. A RAF
 * loop reads the audio engine's already-smoothed levels and pushes them (throttled)
 * into the scene props; a second timer rotates scenes. Only the active (and, mid
 * transition, the outgoing) scene is mounted, so at most two `<Shader>` canvases live
 * at once.
 */
export function Stage({ engine }: { engine: AudioEngine }) {
  const [levels, setLevels] = useState<AudioLevels>(ZERO_LEVELS);
  const [layers, setLayers] = useState<Layer[]>([{ id: 0, scene: 0 }]);
  const [shown, setShown] = useState<ReadonlySet<number>>(() => new Set([0]));
  const nextId = useRef(1);
  const sceneIdx = useRef(0);
  const busy = useRef(false);

  // advance is re-created each render so it sees current state; callers hit the ref.
  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (busy.current) return; // ignore taps/timer while a crossfade is running
    busy.current = true;
    const target = (sceneIdx.current + 1) % SCENES.length;
    sceneIdx.current = target;
    const id = nextId.current;
    nextId.current += 1;
    setLayers((ls) => [...ls.slice(-1), { id, scene: target }]); // keep current top + the newcomer
    // Mount the newcomer transparent, then flip opacity on a later frame so CSS animates it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setShown((s) => new Set(s).add(id))),
    );
    window.setTimeout(() => {
      setLayers((ls) => ls.filter((l) => l.id === id));
      setShown(new Set([id]));
      busy.current = false;
    }, TRANSITION_MS);
  };

  useEffect(() => {
    let raf = 0;
    let lastEmit = 0;
    let lastTs = 0;
    const pointer = new AudioPointer();
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const next = engine.read(ts);
      if (!next) return;
      // The engine already smooths every band, so we just fan the levels out. The
      // pointer reads velocity, so it must run every frame; React state is throttled.
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
      lastTs = ts;
      pointer.emit(next, dt);
      if (ts - lastEmit >= EMIT_MS) {
        lastEmit = ts;
        setLevels(next);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  useEffect(() => {
    const timer = window.setInterval(() => advanceRef.current(), HOLD_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advanceRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-nyx" onClick={() => advanceRef.current()}>
      {layers.map((l) => (
        <div
          key={l.id}
          className="absolute inset-0"
          style={{ opacity: shown.has(l.id) ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease-in-out` }}
        >
          <Shader disableTelemetry className="block h-full w-full" style={{ width: "100%", height: "100%" }}>
            {renderScene(SCENES[l.scene], levels)}
          </Shader>
        </div>
      ))}
    </main>
  );
}
