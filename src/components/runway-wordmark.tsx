import { cn } from "@/lib/utils";

const SIZE = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl",
  xl: "text-6xl sm:text-7xl",
  hero: "text-7xl sm:text-8xl lg:text-9xl",
} as const;

/** Run(way)time event wordmark: serif display with helio italic parenthetical. */
export function RunwayWordmark({
  className,
  size = "lg",
}: {
  className?: string;
  size?: keyof typeof SIZE;
}) {
  return (
    <span
      className={cn("font-display font-extralight tracking-tight text-cloud", SIZE[size], className)}
      aria-label="Run(way)time"
    >
      Run<span className="mr-[0.12em] italic text-helio">(way)</span>time
    </span>
  );
}
