"use client";

import { Check, Hand, LogOut, Play, Wine, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { EVENT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { authedFetch, type OperatorOrder } from "@/app/operator/api";
import { drinkCategoryForLabel, drinkCategoryIcon } from "@/app/operator/drink-visuals";
import { cn } from "@/lib/utils";

type LaneKey = "queued" | "in_progress" | "ready";

interface Lane {
  key: LaneKey;
  title: string;
  sub: string;
  /** Status the primary button advances the order to. */
  next: string;
  actionLabel: string;
  Icon: LucideIcon;
  btn: string;
  ring: string;
  chip: string;
  dot: string;
}

// Bright gem fills read well under the dark-text label and color-code each lane's action.
const LANES: readonly Lane[] = [
  {
    key: "queued",
    title: "Queued",
    sub: "start these",
    next: "in_progress",
    actionLabel: "Start",
    Icon: Play,
    btn: "bg-gem-topaz",
    ring: "border-gem-topaz/50",
    chip: "text-gem-topaz",
    dot: "bg-gem-topaz",
  },
  {
    key: "in_progress",
    title: "Making",
    sub: "finish and serve",
    next: "ready",
    actionLabel: "Mark ready",
    Icon: Check,
    btn: "bg-gem-aquamarine",
    ring: "border-gem-aquamarine/50",
    chip: "text-gem-aquamarine",
    dot: "bg-gem-aquamarine",
  },
  {
    key: "ready",
    title: "Ready",
    sub: "hand to the guest",
    next: "picked_up",
    actionLabel: "Picked up",
    Icon: Hand,
    btn: "bg-gem-peridot",
    ring: "border-gem-peridot/60",
    chip: "text-gem-peridot",
    dot: "bg-gem-peridot",
  },
];

function guestName(order: OperatorOrder): string {
  return order.guest?.displayName ?? order.guest?.gameId ?? "Guest";
}

function OrderCard({
  order,
  lane,
  busy,
  onAdvance,
  onCancel,
}: {
  order: OperatorOrder;
  lane: Lane;
  busy: boolean;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const CategoryIcon = drinkCategoryIcon(drinkCategoryForLabel(order.label));
  return (
    <li
      className={cn(
        "border bg-nyx-soft/80 p-4",
        lane.ring,
        lane.key === "ready" && "shadow-[0_0_26px_rgba(195,217,90,0.22)]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full border", lane.ring, lane.chip)}
        >
          <CategoryIcon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold leading-tight text-cloud">{order.label}</p>
          <p className="mt-1 truncate text-base text-ash">
            for <span className={cn("font-medium", lane.chip)}>{guestName(order)}</span>
          </p>
          <p className="truncate text-xs uppercase tracking-[0.15em] text-ash">
            {order.guest?.gameId ?? "?"}
            {order.modifiers.length > 0 ? ` · ${order.modifiers.join(", ")}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onAdvance}
          disabled={busy}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 py-3 text-base font-semibold uppercase tracking-wide text-nyx transition-opacity disabled:opacity-50",
            lane.btn,
          )}
        >
          <lane.Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
          {lane.actionLabel}
        </button>
        {lane.key !== "ready" ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={`cancel ${order.label}`}
            className="flex w-14 shrink-0 items-center justify-center border border-nyx-line text-ash transition-colors hover:border-gem-garnet hover:text-gem-garnet disabled:opacity-50"
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </button>
        ) : null}
      </div>
    </li>
  );
}

function LaneColumn({
  lane,
  orders,
  busyId,
  onUpdate,
}: {
  lane: Lane;
  orders: OperatorOrder[];
  busyId: string | null;
  onUpdate: (id: string, status: string) => void;
}) {
  return (
    <section className="flex min-h-0 flex-col border border-nyx-line/70 bg-nyx-soft/30">
      <div className="flex items-center justify-between border-b border-nyx-line/70 px-4 py-3">
        <span className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", lane.dot)} />
          <span className="text-sm uppercase tracking-[0.25em] text-cloud">{lane.title}</span>
        </span>
        <span className="text-lg tabular-nums text-ash">{orders.length}</span>
      </div>
      <ul className="flex-1 space-y-3 overflow-auto p-3">
        {orders.length === 0 ? (
          <li className="py-10 text-center text-sm text-ash">nothing to {lane.sub}</li>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              lane={lane}
              busy={busyId === order.id}
              onAdvance={() => onUpdate(order.id, lane.next)}
              onCancel={() => onUpdate(order.id, "cancelled")}
            />
          ))
        )}
      </ul>
    </section>
  );
}

/** The bartender display: one card per open order, one tap to move it along. */
export function BarBoard({ token, onLock }: { token: string; onLock: () => void }) {
  const [active, setActive] = useState<OperatorOrder[]>([]);
  const [error, setError] = useState<"auth" | "offline" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/drink-orders");
      if (res.status === 401) return setError("auth");
      if (!res.ok) return setError("offline");
      const data = (await res.json()) as { active: OperatorOrder[] };
      setActive(data.active);
      setError(null);
    } catch {
      setError("offline");
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const update = useCallback(
    async (id: string, status: string) => {
      setBusyId(id);
      try {
        const res = await authedFetch(token, `/api/operator/drink-orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        if (res.ok) await refresh();
        else setError(res.status === 401 ? "auth" : "offline");
      } catch {
        setError("offline");
      } finally {
        setBusyId(null);
      }
    },
    [token, refresh],
  );

  const byLane = useMemo(() => {
    const groups: Record<LaneKey, OperatorOrder[]> = { queued: [], in_progress: [], ready: [] };
    for (const order of active) {
      if (order.status in groups) groups[order.status as LaneKey].push(order);
    }
    return groups;
  }, [active]);

  return (
    <main className="relative flex min-h-dvh flex-col bg-nyx scanlines">
      <header className="relative z-[2] flex items-center justify-between gap-4 border-b border-nyx-line px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <LabyrinthThread size={30} />
          <div>
            <p className="font-display text-lg font-extralight tracking-tight text-cloud">Bar</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-ash">{EVENT_NAME}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-right">
            <span className="block text-xl tabular-nums text-cloud">{active.length}</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-ash">open</span>
          </span>
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              error ? "bg-gem-garnet" : "bg-gem-peridot animate-pulse-slow",
            )}
            title={error ? "reconnecting" : "live"}
          />
          <button
            type="button"
            onClick={onLock}
            className="flex items-center gap-1.5 border border-nyx-line px-3 py-2 text-xs uppercase tracking-widest text-ash transition-colors hover:border-helio/50 hover:text-cloud"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            lock
          </button>
        </div>
      </header>

      {error === "auth" ? (
        <p className="relative z-[2] border-b border-gem-garnet/40 bg-gem-garnet/10 px-4 py-3 text-center text-sm text-cloud sm:px-6">
          Token rejected. Ask staff to reopen this display from the operator console.
        </p>
      ) : null}

      {active.length === 0 && !error ? (
        <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-3 text-ash">
          <Wine className="h-9 w-9 animate-pulse-slow" strokeWidth={1} aria-hidden />
          <p className="text-sm uppercase tracking-[0.35em]">no open orders</p>
          <p className="text-xs text-ash/80">new drinks land here the moment a guest texts one in.</p>
        </div>
      ) : (
        <div className="relative z-[2] grid flex-1 gap-3 p-3 sm:p-4 md:grid-cols-3">
          {LANES.map((lane) => (
            <LaneColumn
              key={lane.key}
              lane={lane}
              orders={byLane[lane.key]}
              busyId={busyId}
              onUpdate={update}
            />
          ))}
        </div>
      )}
    </main>
  );
}
