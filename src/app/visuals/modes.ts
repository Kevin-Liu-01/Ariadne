/** Rave-style draw modes for the venue visualizer. Each renders one frame additively. */

import type { Frame } from "@/app/visuals/audio";

export interface Palette {
  name: string;
  colors: string[];
}

// Brand gem hues, grouped into high-contrast trios that cycle on each track change.
export const PALETTES: Palette[] = [
  { name: "helio", colors: ["#d2beff", "#9a7bff", "#5b3ea8"] },
  { name: "garnet", colors: ["#ff7a7a", "#e23b3b", "#7a0c0c"] },
  { name: "peridot", colors: ["#e8ff9a", "#c3d95a", "#6f8f24"] },
  { name: "aquamarine", colors: ["#bdecff", "#7fc7e8", "#2f6f99"] },
  { name: "topaz", colors: ["#ffd9a0", "#ffab57", "#b5641f"] },
];

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

export interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t: number; // elapsed ms
  frame: Frame;
  palette: Palette;
  particles: Particle[];
}

function spectrum({ ctx, w, h, frame, palette }: DrawCtx): void {
  const bars = 72;
  const usable = Math.floor(frame.freq.length * 0.6); // skip the dead high end
  const mid = h * 0.5;
  ctx.lineCap = "round";
  for (let i = 0; i < bars; i += 1) {
    const v = frame.freq[Math.floor((i / bars) * usable)] / 255;
    const len = v ** 1.4 * h * 0.42 + 2;
    const x = (i + 0.5) * (w / bars);
    const color = palette.colors[i % palette.colors.length];
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = (w / bars) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, mid - len);
    ctx.lineTo(x, mid + len);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function radial({ ctx, w, h, frame, palette, t }: DrawCtx): void {
  const cx = w / 2;
  const cy = h / 2;
  const spokes = 120;
  const usable = Math.floor(frame.freq.length * 0.5);
  const minDim = Math.min(w, h);
  const baseR = minDim * 0.13 + frame.bass * minDim * 0.12;
  const rot = t * 0.00008;
  for (let i = 0; i < spokes; i += 1) {
    const v = frame.freq[Math.floor((i / spokes) * usable)] / 255;
    const len = v ** 1.3 * minDim * 0.3 + 4;
    const a = (i / spokes) * Math.PI * 2 + rot;
    const color = palette.colors[i % palette.colors.length];
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * baseR, cy + Math.sin(a) * baseR);
    ctx.lineTo(cx + Math.cos(a) * (baseR + len), cy + Math.sin(a) * (baseR + len));
    ctx.stroke();
  }
  ctx.shadowColor = palette.colors[0];
  ctx.shadowBlur = 30;
  ctx.fillStyle = palette.colors[0];
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 0.5 + frame.bass * 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function waveform({ ctx, w, h, frame, palette }: DrawCtx): void {
  const wave = frame.wave;
  const n = wave.length;
  const layers = palette.colors;
  for (let layer = 0; layer < layers.length; layer += 1) {
    const offset = (layer - (layers.length - 1) / 2) * 20;
    const amp = h * 0.2 * (1 - layer * 0.18) * (0.5 + frame.level * 1.8);
    ctx.strokeStyle = layers[layer];
    ctx.shadowColor = layers[layer];
    ctx.shadowBlur = 24 - layer * 5;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < n; i += 4) {
      const x = (i / n) * w;
      const y = h / 2 + offset + ((wave[i] - 128) / 128) * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function swarm({ ctx, w, h, frame, palette, particles }: DrawCtx): void {
  const cx = w / 2;
  const cy = h / 2;
  if (frame.beat) {
    const count = 24 + Math.floor(frame.bass * 44);
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6 * (0.5 + frame.bass);
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0,
        max: 50 + Math.random() * 45,
        size: 2 + Math.random() * 3,
        color: palette.colors[i % palette.colors.length],
      });
    }
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life += 1;
    if (p.life > p.max) {
      particles.splice(i, 1);
      continue;
    }
    const k = 1 - p.life / p.max;
    ctx.globalAlpha = k;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * k + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  if (particles.length > 800) particles.splice(0, particles.length - 800);
}

/** Subwoofer-driven rings: the core bass-reactive mode for the venue screen. */
function bassPulse({ ctx, w, h, frame, palette, t }: DrawCtx): void {
  const cx = w / 2;
  const cy = h / 2;
  const minDim = Math.min(w, h);
  const kick = frame.beat ? 1 : 0;
  const rings = 5;
  for (let i = 0; i < rings; i += 1) {
    const phase = (t * 0.0012 + i * 0.18) % 1;
    const r =
      minDim * (0.08 + frame.bass * 0.38 + kick * 0.06) +
      phase * minDim * 0.42 +
      i * minDim * 0.04;
    const alpha = (1 - phase) * (0.22 + frame.bass * 0.55) * (frame.beat ? 1.35 : 1);
    const color = palette.colors[i % palette.colors.length];
    ctx.strokeStyle = color;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.lineWidth = 2 + frame.bass * 10 + kick * 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = frame.beat ? 42 : 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.35 + frame.bass * 0.65;
  ctx.fillStyle = palette.colors[0];
  ctx.shadowBlur = 48 + frame.bass * 40;
  ctx.beginPath();
  ctx.arc(cx, cy, minDim * (0.06 + frame.bass * 0.14) + kick * 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export const MODES: { name: string; draw: (d: DrawCtx) => void }[] = [
  { name: "bass", draw: bassPulse },
  { name: "spectrum", draw: spectrum },
  { name: "radial", draw: radial },
  { name: "waveform", draw: waveform },
  { name: "swarm", draw: swarm },
];
