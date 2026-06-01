"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Suggestion {
  id: string;
  label: string;
  note?: string;
  icon?: ReactNode;
  /** Flagged with a "pick" tag, the operator's recommended switch. */
  recommended?: boolean;
}

/**
 * A labelled grid of switch-to options. One option may be marked `recommended`
 * (the balanced gem, the same-category drink, the next scene); the active one is
 * highlighted. This is the shared "recommend things to switch to" surface every
 * operator editor composes.
 */
export function RecommendationStrip({
  label,
  hint,
  items,
  activeId,
  onPick,
  columns = 2,
}: {
  label: string;
  hint?: string;
  items: Suggestion[];
  activeId?: string | null;
  onPick: (id: string) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.25em] text-helio">{label}</p>
        {hint ? <p className="text-[10px] text-ash">{hint}</p> : null}
      </div>
      <div
        className={cn(
          "mt-2 grid gap-2",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-2 border px-3 py-2 text-left transition-colors",
                active
                  ? "border-helio bg-helio/10"
                  : "border-nyx-line bg-nyx hover:border-helio/50",
              )}
            >
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-cloud">{item.label}</span>
                {item.note ? (
                  <span className="block truncate text-[10px] text-ash">{item.note}</span>
                ) : null}
              </span>
              {item.recommended && !active ? (
                <span className="flex shrink-0 items-center gap-0.5 text-[9px] uppercase tracking-widest text-helio">
                  <Sparkles className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                  pick
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
