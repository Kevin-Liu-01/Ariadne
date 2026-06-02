"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EVENT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { AudioEngine, type Frame, TransitionDetector } from "@/app/visuals/audio";
import { MODES, PALETTES, type Particle } from "@/app/visuals/modes";

interface Runtime {
  mode: number;
  palette: number;
  set: number;
  flash: number;
  lastTs: number;
  startTs: number;
  particles: Particle[];
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  frame: Frame,
  paletteName: string,
  modeName: string,
  set: number,
): void {
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(210,190,255,0.85)";
  ctx.fillText("LISTENING", 20, 18);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(20, 36, 120, 4);
  ctx.fillStyle = "rgba(210,190,255,0.9)";
  ctx.fillRect(20, 36, 120 * Math.min(1, frame.level * 1.6), 4);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(245,245,245,0.75)";
  ctx.fillText(`${modeName.toUpperCase()} . ${paletteName.toUpperCase()}`, w - 20, 18);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`SET ${set}`, w - 20, 36);
  ctx.textAlign = "left";
}

/**
 * Venue ambient screen. The Mac's mic feeds a Web Audio analyser; the canvas
 * paints rave-style visuals that react to the room and switch style + palette on
 * each detected track change. Per-frame state lives in refs so React never
 * re-renders during playback.
 */
export default function VisualsPage() {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const rt = useRef<Runtime>({ mode: 0, palette: 0, set: 1, flash: 0, lastTs: 0, startTs: 0, particles: [] });

  const shift = useCallback(() => {
    const s = rt.current;
    s.mode = (s.mode + 1) % MODES.length;
    s.palette = (s.palette + 1) % PALETTES.length;
    s.flash = 1;
  }, []);

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
    rt.current.startTs = performance.now();
    rt.current.lastTs = rt.current.startTs;
    setStarted(true);
  }, []);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !engine || !ctx) return;

    const detector = new TransitionDetector();
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const s = rt.current;
      const dt = Math.min(64, ts - s.lastTs);
      s.lastTs = ts;
      const frame = engine.read(ts);
      if (!frame) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(15,15,15,0.18)";
      ctx.fillRect(0, 0, w, h);

      if (detector.update(frame.energy, dt, ts)) {
        s.mode = (s.mode + 1) % MODES.length;
        s.palette = (s.palette + 1) % PALETTES.length;
        s.set += 1;
        s.flash = 1;
      }

      const palette = PALETTES[s.palette];
      ctx.globalCompositeOperation = "lighter";
      MODES[s.mode].draw({ ctx, w, h, t: ts - s.startTs, frame, palette, particles: s.particles });

      if (s.flash > 0.01) {
        ctx.fillStyle = palette.colors[0];
        ctx.globalAlpha = s.flash * 0.25;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
        s.flash *= 0.9;
      }

      drawHud(ctx, w, frame, palette.name, MODES[s.mode].name, s.set);
    };
    raf = requestAnimationFrame(loop);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        shift();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      engine.stop();
    };
  }, [started, shift]);

  if (started) {
    return (
      <main className="relative h-dvh w-full overflow-hidden bg-nyx" onClick={shift}>
        <canvas ref={canvasRef} className="block h-full w-full" />
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-ash/60">
          tap or space to shift the vibe
        </p>
      </main>
    );
  }

  return (
    <main className="relative flex h-dvh flex-col items-center justify-center bg-nyx px-6 text-center scanlines">
      <div className="relative z-[2] flex max-w-md flex-col items-center animate-rise">
        <LabyrinthThread size={92} animate />
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-helio">{EVENT_NAME}</p>
        <h1 className="mt-3 font-display text-5xl font-extralight tracking-tight text-cloud">Stage visuals</h1>
        <p className="mt-3 text-sm leading-relaxed text-ash">
          Point this screen at the room and let the Mac hear the music. The visuals breathe with the
          sound and shift on every track change.
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
