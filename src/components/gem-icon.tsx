import type { ReactNode } from "react";
import { GEMS, type GemId } from "@/constants/gems";
import { cn } from "@/lib/utils";

/**
 * A faceted gem glyph, one distinct cut per gem, recolored by the gem's hex.
 * The fill comes through `currentColor` (set from the hex) and the soft glow
 * through a drop-shadow filter — the documented runtime-value exception to the
 * Tailwind-only rule.
 */

const facet = {
  fill: "none" as const,
  stroke: "#ffffff",
  strokeOpacity: 0.4,
  strokeWidth: 0.7,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

const SHAPES: Record<GemId, ReactNode> = {
  // Round brilliant — faceted, narrowing to a point.
  amethyst: (
    <>
      <polygon points="7,4 17,4 21,9 12,21 3,9" fill="currentColor" />
      <polygon points="9.5,9 14.5,9 12,21" fill="#000" fillOpacity={0.12} />
      <g {...facet}>
        <path d="M3,9 H21" />
        <path d="M7,4 L9.5,9 L12,21" />
        <path d="M17,4 L14.5,9 L12,21" />
        <path d="M9.5,9 H14.5" />
      </g>
    </>
  ),
  // Cushion — rounded rhombus with a cross.
  garnet: (
    <>
      <polygon points="12,3 21,12 12,21 3,12" fill="currentColor" />
      <g {...facet}>
        <polygon points="12,7 17,12 12,17 7,12" />
        <path d="M12,3 V7 M12,17 V21 M3,12 H7 M17,12 H21" />
      </g>
    </>
  ),
  // Cabochon — smooth oval dome with a sheen (no facets).
  moonstone: (
    <>
      <ellipse cx="12" cy="12" rx="6.5" ry="8.5" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="6.5" ry="8.5" fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={0.7} />
      <path d="M9,6.5 Q6.8,9.5 7.9,13.5" stroke="#ffffff" strokeOpacity={0.65} strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </>
  ),
  // Emerald cut — clipped rectangle with step facets.
  peridot: (
    <>
      <polygon points="8,3 16,3 21,8 21,16 16,21 8,21 3,16 3,8" fill="currentColor" />
      <g {...facet}>
        <polygon points="9,7 15,7 17,9 17,15 15,17 9,17 7,15 7,9" />
        <path d="M7,9 H17 M7,15 H17" />
      </g>
    </>
  ),
  // Pear — teardrop.
  aquamarine: (
    <>
      <path d="M12,3 C16,9 18.5,12 18.5,15 A6.5,6.5 0 1 1 5.5,15 C5.5,12 8,9 12,3 Z" fill="currentColor" />
      <g {...facet}>
        <path d="M12,4 V20" />
        <path d="M6,15 H18" />
      </g>
    </>
  ),
  // Trillion — rounded triangle, point up.
  topaz: (
    <>
      <polygon points="12,4 20,19 4,19" fill="currentColor" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
      <g {...facet}>
        <path d="M12,4 V13" />
        <path d="M12,13 L4.5,18.5" />
        <path d="M12,13 L19.5,18.5" />
        <path d="M7,16.5 H17" />
      </g>
    </>
  ),
};

export function GemIcon({
  gem,
  size = 24,
  label,
  className,
}: {
  gem: GemId;
  size?: number;
  label?: string;
  className?: string;
}) {
  const { hex, label: gemLabel } = GEMS[gem];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? gemLabel}
      className={cn("shrink-0", className)}
      style={{ color: hex, filter: `drop-shadow(0 0 ${Math.max(2, size * 0.16)}px ${hex}aa)` }}
    >
      {SHAPES[gem]}
    </svg>
  );
}
