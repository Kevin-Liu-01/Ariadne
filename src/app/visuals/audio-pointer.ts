/**
 * A virtual, audio-reactive pointer for the venue stage.
 *
 * Several shaders.com effects are "interactive" — they follow the cursor and inject
 * flow from pointer VELOCITY (ChromaFlow, GridDistortion, Smoke's mouseInfluence...).
 * The library only learns the pointer from real `mousemove`/`touchmove` events on
 * `window`, so on a projector with no cursor those effects sit dead. Rather than fork
 * the library, this orbits a synthetic pointer and dispatches `mousemove` each frame,
 * with its speed and excursion driven by the music — so the kick and energy slosh the
 * fluids the way a hand would. Movement (not just position) is what those shaders read,
 * so the path always keeps moving and darts on the beat for a burst of flow.
 */

import type { AudioLevels } from "@/app/visuals/scenes";

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export class AudioPointer {
  private angle = Math.random() * Math.PI * 2;
  private jitter = 0;

  /** Advance the path by `dt` seconds under the current audio and emit a move event. */
  emit(a: AudioLevels, dt: number): void {
    if (typeof window === "undefined") return;

    // Orbit faster + wider with the music; the beat spikes angular speed and radius so
    // the pointer darts, which is what makes the fluids burst on each kick.
    const angularSpeed = 0.4 + a.level * 3 + a.beat * 7;
    this.angle += angularSpeed * dt;
    this.jitter += dt * 55;

    const radius = 0.08 + a.bass * 0.24 + a.beat * 0.2;
    const shake = Math.sin(this.jitter) * a.treble * 0.03;
    // A wandering Lissajous (not a clean circle) reads as organic slosh, not a spin.
    const fx = 0.5 + Math.cos(this.angle) * radius + Math.cos(this.angle * 0.37) * radius * 0.3 + shake;
    const fy = 0.46 + Math.sin(this.angle * 1.13) * radius * 0.95;

    window.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: clamp01(fx) * window.innerWidth,
        clientY: clamp01(fy) * window.innerHeight,
        bubbles: true,
      }),
    );
  }
}
