"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConsoleTab<Id extends string = string> {
  id: Id;
  label: string;
  Icon: LucideIcon;
  /** Optional live count rendered as a pill (e.g. open orders, pending songs). */
  badge?: number;
}

/**
 * The staff console's primary navigation: a row of section tabs. Kept presentational
 * so the page owns the active id and renders the matching surface. Sticks to the top
 * of the scroll so the operator can jump sections while deep in a long list.
 */
export function ConsoleTabs<Id extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: ConsoleTab<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Console sections"
      className="sticky top-0 z-20 -mx-4 flex flex-wrap gap-1.5 border-b border-nyx-line bg-nyx/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
    >
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "flex items-center gap-2 border px-3.5 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors",
              on
                ? "border-helio/50 bg-helio/10 text-helio"
                : "border-nyx-line text-ash hover:border-helio/40 hover:text-cloud",
            )}
          >
            <tab.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {tab.label}
            {tab.badge ? (
              <span
                className={cn(
                  "ml-0.5 min-w-4 rounded-full px-1 text-center text-[9px] font-medium tabular-nums",
                  on ? "bg-helio text-nyx" : "bg-nyx-line text-cloud",
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
