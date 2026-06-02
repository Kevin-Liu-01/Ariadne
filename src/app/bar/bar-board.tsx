"use client";

import { Check, CheckCheck, LogOut, Wine } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EVENT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { authedFetch, type OperatorOrder } from "@/app/operator/api";
import { drinkCategoryForLabel, drinkCategoryIcon } from "@/app/operator/drink-visuals";
import { cn } from "@/lib/utils";

const TO_MAKE = new Set(["queued", "in_progress"]);

function guestName(order: OperatorOrder): string {
  return order.guest?.displayName ?? order.guest?.gameId ?? "Guest";
}

function DrinkCard({
  order,
  busy,
  onDone,
}: {
  order: OperatorOrder;
  busy: boolean;
  onDone: () => void;
}) {
  const CategoryIcon = drinkCategoryIcon(drinkCategoryForLabel(order.label));
  const making = TO_MAKE.has(order.status);

  return (
    <li
      className={cn(
        "border p-5",
        making
          ? "border-nyx-line bg-nyx-soft/80"
          : "border-gem-peridot/40 bg-gem-peridot/5",
      )}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-nyx-line/70 text-ash">
          <CategoryIcon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-semibold leading-tight text-cloud">{order.label}</p>
          <p className="mt-1 truncate text-lg text-ash">
            for <span className="font-medium text-cloud">{guestName(order)}</span>
          </p>
          {order.modifiers.length > 0 ? (
            <p className="mt-0.5 truncate text-sm text-ash">{order.modifiers.join(", ")}</p>
          ) : null}
        </div>
        {making ? (
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="flex h-16 w-28 shrink-0 items-center justify-center gap-2 bg-gem-peridot text-lg font-bold uppercase tracking-wide text-nyx transition-opacity disabled:opacity-50"
          >
            <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
            Done
          </button>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium uppercase tracking-[0.15em] text-gem-peridot">
            <CheckCheck className="h-5 w-5" strokeWidth={2} aria-hidden />
            ready
          </span>
        )}
      </div>
    </li>
  );
}

/** The bartender display. See a drink, make it, tap Done. The agent handles pickup. */
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

  const markDone = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        const res = await authedFetch(token, `/api/operator/drink-orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "ready" }),
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

  const sorted = useMemo(() => {
    const making = active.filter((o) => TO_MAKE.has(o.status));
    const ready = active.filter((o) => o.status === "ready");
    return [...making, ...ready];
  }, [active]);

  const makingCount = sorted.filter((o) => TO_MAKE.has(o.status)).length;

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
        <div className="flex items-center gap-5">
          <span className="text-right">
            <span className="block text-xl tabular-nums text-cloud">{makingCount}</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-ash">to make</span>
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
          Token rejected. Ask staff to reopen this display.
        </p>
      ) : null}

      {sorted.length === 0 && !error ? (
        <div className="relative z-[2] flex flex-1 flex-col items-center justify-center gap-3 text-ash">
          <Wine className="h-9 w-9 animate-pulse-slow" strokeWidth={1} aria-hidden />
          <p className="text-sm uppercase tracking-[0.35em]">no drinks right now</p>
          <p className="text-xs text-ash/80">orders show up here the moment a guest texts one in.</p>
        </div>
      ) : (
        <ul className="relative z-[2] flex-1 space-y-3 overflow-auto p-3 sm:p-5">
          {sorted.map((order) => (
            <DrinkCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              onDone={() => markDone(order.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
