import { cn } from "@/lib/utils";

/**
 * The Ariadne mark, hand-built as a transparent SVG: faint concentric labyrinth
 * walls (each broken by one gap) and a single glowing thread that actually
 * traverses the corridors — entering at the top, weaving side to side, and
 * passing through every wall gap to the knot at the center.
 *
 * Transparent background, so it drops cleanly into tight spots and recolors with
 * the brand. With `animate`, the thread draws itself (stroke-dashoffset) and the
 * knot blooms in as it arrives.
 */

const C = 50;

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

/** A near-full circle of radius `r` with one `gapDeg` opening centered at `gapAt`. */
function wall(r: number, gapAt: number, gapDeg = 34): string {
  const [sx, sy] = polar(r, gapAt + gapDeg / 2);
  const [ex, ey] = polar(r, gapAt - gapDeg / 2);
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

const TOP = -90;
const BOTTOM = 90;

// Walls sit between the thread's corridors; gaps line up exactly with the
// thread's top/bottom steps, so the thread only ever crosses a wall at its gap.
const WALLS: string[] = [
  wall(44.5, TOP), // entrance
  wall(35.5, BOTTOM),
  wall(26.5, TOP),
  wall(17.5, BOTTOM),
  wall(8.5, TOP),
];

// Corridor arcs at r = 40, 31, 22, 13 (each between two walls), with radial steps
// at top/bottom through the gaps, curling into the center.
const THREAD =
  "M 50 10 A 40 40 0 0 1 50 90 L 50 81 A 31 31 0 0 0 50 19 L 50 28 A 22 22 0 0 1 50 72 L 50 63 A 13 13 0 0 0 50 37 L 50 45 A 5 5 0 0 1 50 55 L 50 50";

export function LabyrinthThread({
  size = 64,
  animate = false,
  className,
}: {
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Ariadne"
      className={cn("shrink-0", className)}
    >
      <g
        fill="none"
        stroke="var(--color-ash)"
        strokeOpacity={0.3}
        strokeWidth={1.4}
        strokeLinecap="round"
      >
        {WALLS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path
        d={THREAD}
        fill="none"
        stroke="var(--color-helio)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={cn(animate && "thread-draw")}
        style={{ filter: "drop-shadow(0 0 3.5px var(--color-helio))" }}
      />
      <circle
        cx={50}
        cy={50}
        r={3.4}
        fill="var(--color-helio)"
        className={cn(animate ? "thread-knot" : "animate-pulse-slow")}
        style={{ filter: "drop-shadow(0 0 6px var(--color-helio))" }}
      />
    </svg>
  );
}
