"use client";

import { Check, Hand, LogOut, Trash2, Wine } from "lucide-react";
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

/**
 * One order, one tap. The main button is the order's next step: "Ready" while a
 * drink is being made, then "Picked up" once it's at the bar. Delete (for a drink
 * the guest never collects) sits apart in the corner and asks to confirm, so it
 * can't be hit by accident next to the main button.
 */
function DrinkCard({
  order,
  busy,
  onAdvance,
  onDelete,
}: {
  order: OperatorOrder;
  busy: boolean;
  onAdvance: () => void;
  onDelete: () => void;
}) {
  const CategoryIcon = drinkCategoryIcon(drinkCategoryForLabel(order.label));
  const making = TO_MAKE.has(order.status);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3500);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  return (
    <li
      className={cn(
        "relative border p-5",
        making ? "border-nyx-line bg-nyx-soft/80" : "border-gem-peridot/40 bg-gem-peridot/5",
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (confirmDelete) {
            onDelete();
            setConfirmDelete(false);
          } else {
            setConfirmDelete(true);
          }
        }}
        disabled={busy}
        aria-label={confirmDelete ? "confirm delete order" : "delete order"}
        className={cn(
          "absolute right-2 top-2 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] uppercase tracking-widest transition-colors disabled:opacity-50",
          confirmDelete
            ? "bg-gem-garnet/90 font-semibold text-cloud"
            : "text-ash/60 hover:text-gem-garnet",
        )}
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        {confirmDelete ? "confirm" : null}
      </button>

      <div className="flex items-center gap-4 pr-8">
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
        <button
          type="button"
          onClick={onAdvance}
          disabled={busy}
          className={cn(
            "flex h-16 w-32 shrink-0 items-center justify-center gap-2 text-lg font-bold uppercase tracking-wide text-nyx transition-opacity disabled:opacity-50",
            making ? "bg-gem-peridot" : "bg-helio",
          )}
        >
          {making ? (
            <>
              <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
              Ready
            </>
          ) : (
            <>
              <Hand className="h-6 w-6" strokeWidth={2.5} aria-hidden />
              Picked up
            </>
          )}
        </button>
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

  const setStatus = useCallback(
    async (id: string, status: "ready" | "picked_up" | "expired") => {
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

  /** The order's next step: make it (Ready), or hand it over (Picked up). */
  const advance = useCallback(
    (id: string, status: string) => setStatus(id, status === "ready" ? "picked_up" : "ready"),
    [setStatus],
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
              onAdvance={() => advance(order.id, order.status)}
              onDelete={() => setStatus(order.id, "expired")}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
