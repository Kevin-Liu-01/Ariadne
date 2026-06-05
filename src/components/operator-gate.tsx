"use client";

import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
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
 * A waves-lit brand header with the Ariadne mark in a glowing ring, then the
 * description, optional detail, and the token field with a show/hide toggle. One
 * component so every staff entry point reads the same and stays in sync.
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
  const [reveal, setReveal] = useState(false);

  return (
    <div
      className={cn(
        "relative w-full max-w-md animate-rise overflow-hidden border border-nyx-line bg-nyx-soft/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm",
        className,
      )}
    >
      {/* Helio hairline along the top edge — the "powered on" tell. */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-helio/70 to-transparent" />

      <header className="bgimg-nyx-waves relative border-b border-nyx-line px-6 pb-8 pt-10 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-nyx/75 via-nyx/45 to-nyx-soft/95" />
        <div className="relative z-[2] flex flex-col items-center">
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-3 rounded-full bg-helio/20 blur-2xl"
              aria-hidden
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-helio/40 bg-nyx/70 shadow-[0_0_40px_-8px_rgba(210,190,255,0.55)] backdrop-blur-sm">
              <LabyrinthThread size={58} animate />
            </div>
          </div>
          <h1 className="mt-5 font-display text-3xl font-extralight tracking-tight text-cloud">
            {title}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-helio">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {PRODUCT_NAME} · {VENUE}
          </p>
        </div>
      </header>

      <div className="px-6 pb-7 pt-6">
        <p className="text-center text-sm leading-relaxed text-ash">{description}</p>

        {children ? <div className="mt-6">{children}</div> : null}

        <label className="mt-6 block">
          <span className="text-[10px] uppercase tracking-[0.25em] text-helio">operator token</span>
          <div className="relative mt-2">
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onUnlock()}
              type={reveal ? "text" : "password"}
              placeholder="paste your token"
              autoComplete="off"
              spellCheck={false}
              className="w-full border border-nyx-line bg-nyx px-4 py-3 pr-11 text-cloud outline-none transition-colors placeholder:text-ash/50 focus:border-helio/60 focus:shadow-[0_0_0_1px_rgba(210,190,255,0.25)]"
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "hide token" : "show token"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ash transition-colors hover:text-cloud"
            >
              {reveal ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              )}
            </button>
          </div>
        </label>

        <button
          type="button"
          onClick={onUnlock}
          disabled={value.trim().length === 0}
          className="group mt-3 flex w-full items-center justify-center gap-2 bg-helio px-4 py-3 font-medium uppercase tracking-wide text-nyx transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {action}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
            aria-hidden
          />
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-ash/60">
          <Lock className="h-3 w-3" strokeWidth={1.5} aria-hidden />
          encrypted staff access
        </p>
      </div>
    </div>
  );
}
