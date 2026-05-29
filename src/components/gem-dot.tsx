import { cn } from "@/lib/utils";

interface GemDotProps {
  hex: string;
  size?: number;
  label?: string;
  className?: string;
}

/**
 * A glowing gem indicator. Color is data-driven (per participant), so the fill
 * comes through an inline style -- the documented runtime-value exception to the
 * Tailwind-only rule.
 */
export function GemDot({ hex, size = 12, label, className }: GemDotProps) {
  return (
    <span
      aria-label={label}
      title={label}
      className={cn("inline-block shrink-0 rounded-full ring-1 ring-white/15", className)}
      style={{ width: size, height: size, backgroundColor: hex, boxShadow: `0 0 ${size}px ${hex}55` }}
    />
  );
}
