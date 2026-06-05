"use client";

import { useEffect, useRef, useState } from "react";
import { Shader } from "shaders/react";
import type { AudioEngine } from "@/app/visuals/audio";
import { SCENES, type AudioLevels, ZERO_LEVELS } from "@/app/visuals/scenes";

const TRANSITION_MS = 1600; // crossfade length between scenes
const HOLD_MS = 22000; // how long each scene holds before the next crossfade
const EMIT_MS = 24; // audio -> prop cadence (~40fps); the GPU still animates every frame

interface Layer {
  id: number;
  scene: number;
}

const approach = (prev: number, next: number, k: number): number => prev + (next - prev) * k;

/**
 * Drives the shader scenes from the mic and crossfades between them on a timer. A RAF
 * loop reads the audio engine, smooths each band, and pushes throttled levels into the
 * scene props; a second timer rotates scenes. Only the active (and, mid-transition, the
 * outgoing) scene is mounted, so at most two `<Shader>` canvases live at once.
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
    const acc = { ...ZERO_LEVELS };
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const f = engine.read(ts);
      if (!f) return;
      acc.level = approach(acc.level, f.level, 0.25);
      acc.bass = approach(acc.bass, f.bass, 0.45);
      acc.mid = approach(acc.mid, f.mid, 0.3);
      acc.treble = approach(acc.treble, f.treble, 0.3);
      // Snap to the kick, then decay fast so the pulse punches rather than smears.
      acc.beat = Math.max(f.beatEnv, acc.beat * 0.82);
      if (ts - lastEmit >= EMIT_MS) {
        lastEmit = ts;
        setLevels({ level: acc.level, bass: acc.bass, mid: acc.mid, treble: acc.treble, beat: acc.beat });
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

  const topScene = layers[layers.length - 1]?.scene ?? 0;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-nyx" onClick={() => advanceRef.current()}>
      {layers.map((l) => (
        <div
          key={l.id}
          className="absolute inset-0"
          style={{ opacity: shown.has(l.id) ? 1 : 0, transition: `opacity ${TRANSITION_MS}ms ease-in-out` }}
        >
          <Shader disableTelemetry className="block h-full w-full" style={{ width: "100%", height: "100%" }}>
            {SCENES[l.scene].render(levels)}
          </Shader>
        </div>
      ))}
      <p className="pointer-events-none absolute bottom-4 left-1/2 z-[2] -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-ash/60">
        {SCENES[topScene].name} · tap or space to shift
      </p>
    </main>
  );
}
