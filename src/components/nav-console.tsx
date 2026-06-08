"use client";

import { BookOpen, Home, LayoutGrid, QrCode, SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PRODUCT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { SiteCredit } from "@/components/site-credit";
import { cn } from "@/lib/utils";

const ROUTES: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/join", label: "Join", Icon: QrCode },
  { href: "/play", label: "Play", Icon: BookOpen },
  { href: "/projection", label: "Board", Icon: LayoutGrid },
  { href: "/visuals", label: "Visuals", Icon: Sparkles },
  { href: "/operator", label: "Staff", Icon: SlidersHorizontal },
];

/**
 * Surfaces where the floating dock would cover content: the projected board/visuals
 * (the room sees no chrome) and the control-dense staff console (the dock overlaps
 * its tables and action buttons). ⌘K still summons the console on all of them.
 */
const DOCK_HIDDEN_ROUTES = ["/projection", "/visuals", "/operator"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The app's only navigation chrome: an Ariadne mark docked bottom-right that pops a
 * console of routes, replacing the old top nav bar. On projected surfaces the dock is
 * hidden so the room sees no chrome, but ⌘K (Ctrl-K) summons the console from any page.
 */
export function NavConsole() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const dockHidden = DOCK_HIDDEN_ROUTES.includes(pathname);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  // ⌘K / Ctrl-K toggles the console from anywhere — even the projected surfaces where
  // the dock button is hidden.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Escape and outside clicks dismiss the console; move focus into it on open.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div
          id="nav-console"
          ref={panelRef}
          tabIndex={-1}
          className="animate-pop w-60 origin-bottom-right overflow-hidden border border-nyx-line bg-nyx-soft/95 shadow-[0_0_50px_rgba(0,0,0,0.55)] outline-none backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-nyx-line px-4 py-3">
            <span className="flex items-center gap-2">
              <LabyrinthThread size={18} />
              <span className="font-display text-sm font-extralight tracking-tight text-cloud">
                {PRODUCT_NAME}
              </span>
            </span>
            <div className="flex items-center gap-2.5">
              <kbd className="border border-nyx-line px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-ash">
                ⌘K
              </kbd>
              <button
                type="button"
                onClick={close}
                aria-label="Close navigation"
                className="text-ash transition-colors hover:text-cloud"
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          </div>
          <nav aria-label="Site" className="flex flex-col gap-1 p-2">
            {ROUTES.map((route) => {
              const active = isActive(pathname, route.href);
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 border px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors",
                    active
                      ? "border-helio/50 bg-helio/10 text-helio"
                      : "border-transparent text-ash hover:border-nyx-line hover:text-cloud",
                  )}
                >
                  <route.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                  {route.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-nyx-line px-3 py-2.5">
            <SiteCredit className="!justify-start !tracking-[0.15em]" />
          </div>
        </div>
      ) : null}

      {dockHidden ? null : (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="nav-console"
          aria-label="Navigation"
          className={cn(
            "group flex h-14 w-14 items-center justify-center rounded-full border bg-nyx/80 backdrop-blur-md transition-all duration-300 hover:scale-105",
            open
              ? "border-helio/70 shadow-[0_0_36px_rgba(210,190,255,0.42)]"
              : "border-helio/40 shadow-[0_0_22px_rgba(210,190,255,0.22)] hover:border-helio/70",
          )}
        >
          <LabyrinthThread size={34} className="transition-transform group-hover:scale-110" />
        </button>
      )}
    </div>
  );
}
