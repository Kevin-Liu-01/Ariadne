/** Shared labyrinth wall + thread geometry for the mark SVG and favicon. */

export const LABYRINTH_CENTER = 50;

export const TOP = -90;
export const BOTTOM = 90;

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [LABYRINTH_CENTER + r * Math.cos(a), LABYRINTH_CENTER + r * Math.sin(a)];
}

/** A near-full circle with one gap centered at `gapAt`. */
export function wallArc(r: number, gapAt: number, gapDeg = 34): string {
  const [sx, sy] = polar(r, gapAt + gapDeg / 2);
  const [ex, ey] = polar(r, gapAt - gapDeg / 2);
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

export const LABYRINTH_WALLS = [
  wallArc(44.5, TOP),
  wallArc(35.5, BOTTOM),
  wallArc(26.5, TOP),
  wallArc(17.5, BOTTOM),
  wallArc(8.5, TOP),
] as const;

/**
 * Thread follows corridor midlines and only crosses walls at top/bottom gaps (x = center).
 * Corridors sit halfway between consecutive wall radii.
 */
export function labyrinthThreadPath(): string {
  const c = LABYRINTH_CENTER;
  const corridors = [40, 31, 22, 13] as const;

  return [
    `M ${c} ${c - 44.5}`,
    `L ${c} ${c - corridors[0]}`,
    `A ${corridors[0]} ${corridors[0]} 0 0 1 ${c} ${c + corridors[0]}`,
    `L ${c} ${c + corridors[1]}`,
    `A ${corridors[1]} ${corridors[1]} 0 0 0 ${c} ${c - corridors[1]}`,
    `L ${c} ${c - corridors[2]}`,
    `A ${corridors[2]} ${corridors[2]} 0 0 1 ${c} ${c + corridors[2]}`,
    `L ${c} ${c + corridors[3]}`,
    `A ${corridors[3]} ${corridors[3]} 0 0 0 ${c} ${c - corridors[3]}`,
    `L ${c} ${c - 4}`,
    `L ${c} ${c}`,
  ].join(" ");
}
