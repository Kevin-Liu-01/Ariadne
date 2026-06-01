"use client";

import { LayoutGrid, Target, Users, Wine } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { ProjectionSnapshot } from "@/domain/projection";
import { cn } from "@/lib/utils";

const EMPTY: ProjectionSnapshot["stats"] = { checkedIn: 0, missionsCompleted: 0, drinksActive: 0 };

export function StatsRail() {
  const [scene, setScene] = useState("arrival");
  const [stats, setStats] = useState(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/projection/state");
        if (!res.ok || cancelled) return;
        const snap = (await res.json()) as ProjectionSnapshot;
        setScene(snap.scene);
        setStats(snap.stats);
      } catch {
        /* offline; keep last snapshot */
      }
    }

    poll();
    const t = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <section className="reticle grid gap-3 border border-nyx-line bg-nyx-soft/90 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-ash">room snapshot</p>
          <p className="text-sm uppercase tracking-[0.2em] text-cloud">scene · {scene.replace(/_/g, " ")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-6 sm:justify-end">
        <Metric label="checked in" value={stats.checkedIn} Icon={Users} />
        <Metric label="missions solved" value={stats.missionsCompleted} Icon={Target} accent="helio" />
        <Metric label="drinks active" value={stats.drinksActive} Icon={Wine} accent="topaz" />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  Icon,
  accent = "cloud",
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  accent?: "cloud" | "helio" | "topaz";
}) {
  return (
    <div className="min-w-[5.5rem]">
      <p
        className={cn(
          "text-2xl tabular-nums",
          accent === "helio" && "text-helio",
          accent === "topaz" && "text-gem-topaz",
          accent === "cloud" && "text-cloud",
        )}
      >
        {value}
      </p>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-ash">
        <Icon className="h-3 w-3" strokeWidth={1.5} aria-hidden />
        {label}
      </p>
    </div>
  );
}
