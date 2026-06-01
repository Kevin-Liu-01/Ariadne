"use client";

import { BookOpen, Home, LayoutGrid, QrCode, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { PRODUCT_NAME } from "@/constants/event";
import { cn } from "@/lib/utils";

const ROUTES: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/join", label: "Join", Icon: QrCode },
  { href: "/play", label: "Play", Icon: BookOpen },
  { href: "/projection", label: "Board", Icon: LayoutGrid },
  { href: "/operator", label: "Staff", Icon: SlidersHorizontal },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Compact nav strip shared across operator, board, join, and play surfaces. */
export function SiteNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Site"
      className={cn("flex flex-wrap items-center gap-3", className)}
    >
      <Link
        href="/"
        className="group flex shrink-0 items-center gap-2 border border-transparent pr-1 transition-colors hover:text-helio"
        aria-label={`${PRODUCT_NAME} home`}
      >
        <LabyrinthThread size={28} className="transition-transform group-hover:scale-105" />
        <span className="hidden font-display text-sm font-extralight tracking-tight text-cloud sm:inline">
          {PRODUCT_NAME}
        </span>
      </Link>
      <div className="flex flex-wrap gap-2">
      {ROUTES.map((route) => {
        const active = isActive(pathname, route.href);
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "reticle flex items-center gap-1.5 border px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors",
              active
                ? "border-helio/50 bg-helio/10 text-helio"
                : "border-nyx-line/70 text-ash hover:border-helio/40 hover:text-cloud",
            )}
          >
            <route.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {route.label}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
