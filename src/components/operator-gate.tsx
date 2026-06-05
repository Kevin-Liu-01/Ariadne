"use client";

import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PRODUCT_NAME, VENUE } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { cn } from "@/lib/utils";

interface Props {
  /** Surface name shown as the serif card title, e.g. "Staff console". */
  title: string;
  /** Glyph identifying the surface, sits in the helio sub-line. */
  Icon: LucideIcon;
  /** One or two sentences on who this is for and what the token unlocks. */
  description: string;
  /** Controlled token field value. */
  value: string;
  onChange: (value: string) => void;
  /** Fired by the button or Enter in the field. */
  onUnlock: () => void;
  /** Action label, e.g. "unlock" or "open". */
  action?: string;
  /** Optional content between the description and the token field (e.g. a surfaces grid). */
  children?: ReactNode;
  className?: string;
}

/**
 * The shared token gate for every staff surface (operator console, bar, DJ, door).
 * It mirrors the join contact-card: a waves-lit brand header with the Ariadne mark,
 * then the description, optional detail, and the token field. One component so every
 * staff entry point reads the same and stays in sync.
 */
export function OperatorGate({
  title,
  Icon,
  description,
  value,
  onChange,
  onUnlock,
  action = "unlock",
  children,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "w-full max-w-md animate-rise overflow-hidden border border-nyx-line bg-nyx-soft/70 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]",
        className,
      )}
    >
      <header className="bgimg-nyx-waves relative border-b border-nyx-line px-6 pb-7 pt-9 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-nyx/70 via-nyx/40 to-nyx-soft/90" />
        <div className="relative z-[2] flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-helio/40 bg-nyx/70 backdrop-blur-sm">
            <LabyrinthThread size={50} animate />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extralight tracking-tight text-cloud">
            {title}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-helio">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {PRODUCT_NAME} · {VENUE}
          </p>
        </div>
      </header>

      <div className="px-6 pb-8 pt-6">
        <p className="text-center text-sm leading-relaxed text-ash">{description}</p>

        {children ? <div className="mt-6">{children}</div> : null}

        <label className="mt-6 block">
          <span className="sr-only">operator token</span>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onUnlock()}
            type="password"
            placeholder="operator token"
            className="w-full border border-nyx-line bg-nyx px-4 py-3 text-cloud outline-none transition-colors placeholder:text-ash/60 focus:border-helio/50"
          />
        </label>
        <button
          type="button"
          onClick={onUnlock}
          className="group mt-3 flex w-full items-center justify-center gap-2 bg-helio px-4 py-3 font-medium uppercase tracking-wide text-nyx transition-opacity hover:opacity-90"
        >
          {action}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}
