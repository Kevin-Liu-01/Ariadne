import type { ReactNode } from "react";
import { BentoCell } from "@/components/bento-cell";
import { cn } from "@/lib/utils";

/** Shared 12-row grid; rows scale with viewport height on desktop. */
function BentoWall({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("hidden h-full min-h-0 grid-cols-2 grid-rows-12 gap-2 lg:grid", className)}>
      {children}
    </div>
  );
}

/**
 * Left wall.
 *
 * Row budget (12): runway+lines 5 | nytw+archives 2 | team 5
 * Posters sit in a shallow horizontal band (2 rows) so 4:3 assets read landscape;
 * the team photo fills the rest of the column.
 */
export function HeroBentoLeft() {
  return (
    <BentoWall>
      <BentoCell bg="bgimg-event-runway" tone="veil" className="row-span-5" />
      <BentoCell bg="bgimg-nyx-lines" className="row-span-5" />
      <BentoCell bg="bgimg-event-nytw" fit="contain" tone="none" className="row-span-2" />
      <BentoCell bg="bgimg-event-a2a" fit="contain" tone="none" className="row-span-2" />
      <BentoCell bg="bgimg-event-team" tone="veil" className="col-span-2 row-span-5" />
    </BentoWall>
  );
}

/**
 * Right wall: ultrawide team photo spans full width; hero sky anchors the top.
 *
 * Row budget (12): hero sky 5 | team 4 | waves+smoke 3
 */
export function HeroBentoRight() {
  return (
    <BentoWall>
      <BentoCell bg="bgimg-hero-sky" tone="veil" className="col-span-2 row-span-5" />
      <BentoCell bg="bgimg-event-team" tone="veil" className="col-span-2 row-span-4" />
      <BentoCell bg="bgimg-nyx-waves" className="row-span-3" />
      <BentoCell bg="bgimg-hero-smoke" tone="veil" className="row-span-3" />
    </BentoWall>
  );
}
