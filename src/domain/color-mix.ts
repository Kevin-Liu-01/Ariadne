/**
 * Tiny pure hex color mixer for the audio-reactive scenes.
 *
 * The visualizer maps the music's spectral centroid (brightness) onto color: a scene
 * blends between a "cool / bassy" hex and a "warm / bright" hex as the centroid rises, so
 * the palette itself correlates with the frequency content of the track. The `shaders`
 * props take hex strings, so this returns a hex string. Mixing is a straight per-channel
 * sRGB lerp — close enough for endpoints that already live near each other on the brand
 * ramp, and dependency-free so it stays in the pure domain layer and is unit tested.
 */

/** Clamp to the unit interval (mix amounts and any normalized audio feature). */
export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Parse `#rgb` or `#rrggbb` into 0..255 channels. Returns black for anything unparseable. */
function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return [0, 0, 0];
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHexByte = (v: number): string =>
  Math.round(clamp01(v / 255) * 255)
    .toString(16)
    .padStart(2, "0");

/**
 * Blend `a` -> `b` by `t` (clamped to 0..1) in sRGB and return `#rrggbb`. `t = 0` yields
 * `a`, `t = 1` yields `b`, `t = 0.5` is the per-channel midpoint.
 */
export function mixHex(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = ar + (br - ar) * k;
  const g = ag + (bg - ag) * k;
  const bch = ab + (bb - ab) * k;
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(bch)}`;
}
