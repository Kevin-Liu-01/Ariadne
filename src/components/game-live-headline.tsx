import { cn } from "@/lib/utils";

const PUNCH_SEP = " is ";

/**
 * Scene headline for the live game board. Splits on " is " so "The game is live"
 * reads as muted lead + a helio-to-gem gradient punch line for projection.
 */
export function GameLiveHeadline({ headline, className }: { headline: string; className?: string }) {
  const pivot = headline.lastIndexOf(PUNCH_SEP);
  const lead = pivot >= 0 ? headline.slice(0, pivot) : headline;
  const punch = pivot >= 0 ? headline.slice(pivot + PUNCH_SEP.length) : null;

  return (
    <h1 className={cn("font-display text-5xl font-extralight leading-none tracking-tight sm:text-6xl", className)}>
      {punch ? (
        <>
          <span className="text-cloud/70">{lead} </span>
          <span className="bg-gradient-to-r from-helio via-gem-amethyst to-gem-topaz bg-clip-text text-transparent">
            {punch}
          </span>
        </>
      ) : (
        <span className="text-cloud">{headline}</span>
      )}
    </h1>
  );
}
