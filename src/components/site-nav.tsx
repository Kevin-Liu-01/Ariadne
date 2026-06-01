"use client";

import { BookOpen, Home, LayoutGrid, QrCode, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <nav aria-label="Site" className={cn("flex flex-wrap gap-2", className)}>
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
    </nav>
  );
}
