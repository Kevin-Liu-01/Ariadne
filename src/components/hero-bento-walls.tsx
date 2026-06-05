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
 * Row budget (12): runway 5 (col 1) · nyx-lines 2 + cloud-lines 3 (col 2) |
 * nytw+archives 2 | team 5. The right column's top band splits into a dark
 * nyx-lines tile and a brighter cloud-lines tile so the wall is not one flat
 * dark block. Posters sit in a shallow 2-row band; the team photo fills the base.
 */
export function HeroBentoLeft() {
  return (
    <BentoWall>
      <BentoCell bg="bgimg-event-runway" tone="veil" className="row-span-5" />
      <BentoCell bg="bgimg-nyx-lines" className="row-span-2" />
      <BentoCell bg="bgimg-cloud-lines" tone="veil" className="row-span-3" />
      <BentoCell bg="bgimg-event-nytw" fit="contain" tone="none" className="row-span-2" />
      <BentoCell bg="bgimg-event-a2a" fit="contain" tone="none" className="row-span-2" />
      <BentoCell bg="bgimg-event-team" tone="veil" className="col-span-2 row-span-5" />
    </BentoWall>
  );
}

/**
 * Right wall: hero sky anchors the top; the group photo fills the middle band.
 *
 * Row budget (12): hero sky 5 | group 4 | cloud+smoke 3
 */
export function HeroBentoRight() {
  return (
    <BentoWall>
      <BentoCell bg="bgimg-hero-sky" tone="veil" className="col-span-2 row-span-5" />
      <BentoCell bg="bgimg-event-group" tone="veil" className="col-span-2 row-span-4" />
      <BentoCell bg="bgimg-cloud-sky" tone="deep" className="row-span-3" />
      <BentoCell bg="bgimg-hero-smoke" tone="veil" className="row-span-3" />
    </BentoWall>
  );
}
