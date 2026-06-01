import { cn } from "@/lib/utils";
import { LABYRINTH_WALLS, labyrinthThreadPath } from "@/components/labyrinth-mark-paths";

/**
 * The Ariadne mark: concentric broken-ring walls and a helio thread that only
 * crosses each wall at its top or bottom gap.
 */

const THREAD = labyrinthThreadPath();

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
        strokeOpacity={0.35}
        strokeWidth={1.4}
        strokeLinecap="round"
      >
        {LABYRINTH_WALLS.map((d) => (
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
