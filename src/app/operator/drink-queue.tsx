"use client";

import { Check, Hand, Play, Wine, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { DRINK_STATUSES } from "@/constants/drinks";
import { authedFetch, type OperatorOrder } from "@/app/operator/api";
import { cn } from "@/lib/utils";

const NEXT_ACTIONS: Record<string, { label: string; status: string; Icon: LucideIcon }[]> = {
  queued: [
    { label: "start", status: "in_progress", Icon: Play },
    { label: "cancel", status: "cancelled", Icon: X },
  ],
  in_progress: [
    { label: "ready", status: "ready", Icon: Check },
    { label: "cancel", status: "cancelled", Icon: X },
  ],
  ready: [{ label: "picked up", status: "picked_up", Icon: Hand }],
};

const CLOSED = new Set(["picked_up", "cancelled"]);

function OrderRow({
  order,
  onUpdate,
}: {
  order: OperatorOrder;
  onUpdate: (id: string, status: string) => Promise<void>;
}) {
  return (
    <li className="flex items-center gap-3 border border-nyx-line bg-nyx px-4 py-3">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          order.status === "queued" && "bg-gem-topaz",
          order.status === "in_progress" && "bg-gem-aquamarine",
          order.status === "ready" && "bg-gem-peridot animate-pulse-slow",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-cloud">
          {order.label}
          {order.modifiers.length > 0 ? (
            <span className="text-ash"> · {order.modifiers.join(", ")}</span>
          ) : null}
        </p>
        <p className="text-xs tabular-nums tracking-[0.12em] text-ash">
          {order.guest?.gameId ?? "?"} {order.guest?.displayName ? `· ${order.guest.displayName}` : ""}
          {CLOSED.has(order.status) ? ` · ${order.status}` : ""}
        </p>
      </div>
      <div className="flex gap-2">
        {(NEXT_ACTIONS[order.status] ?? []).map((a) => (
          <button
            key={a.status}
            type="button"
            onClick={() => onUpdate(order.id, a.status)}
            className="flex items-center gap-1.5 rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-helio/50"
          >
            <a.Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {a.label}
          </button>
        ))}
      </div>
    </li>
  );
}

export function DrinkQueue({ token }: { token: string }) {
  const [active, setActive] = useState<OperatorOrder[]>([]);
  const [recent, setRecent] = useState<OperatorOrder[]>([]);
  const [error, setError] = useState<"auth" | "offline" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/drink-orders");
      if (res.status === 401) {
        setError("auth");
        return;
      }
      if (!res.ok) {
        setError("offline");
        return;
      }
      const data = (await res.json()) as { active: OperatorOrder[]; recent: OperatorOrder[] };
      setActive(data.active);
      setRecent(data.recent.filter((o) => CLOSED.has(o.status)));
      setError(null);
    } catch {
      setError("offline");
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  async function update(id: string, status: string) {
    const res = await authedFetch(token, `/api/operator/drink-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setNote(res.status === 401 ? "token rejected, lock and re-enter" : "update failed, try again");
      setTimeout(() => setNote(null), 3000);
      return;
    }
    setNote(status === "ready" ? "marked ready, guest text sent" : `marked ${status.replace("_", " ")}`);
    setTimeout(() => setNote(null), 2500);
    refresh();
  }

  const errorCopy =
    error === "auth"
      ? "token rejected. lock the console and paste ARIADNE_OPERATOR_TOKEN from Vercel."
      : error === "offline"
        ? "cannot reach the drink queue. check network."
        : null;

  return (
    <section className="reticle border border-nyx-line bg-nyx-soft p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
          <Wine className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          bar queue
        </h2>
        <span className="tabular-nums text-xs text-ash">{active.length} open</span>
      </div>
      {errorCopy ? <p className="mt-3 text-xs text-red-400">{errorCopy}</p> : null}
      <ul className="mt-4 space-y-2">
        {active.length === 0 && !error ? (
          <li className="text-sm text-ash">no open orders. quiet bar.</li>
        ) : (
          active.map((o) => <OrderRow key={o.id} order={o} onUpdate={update} />)
        )}
      </ul>
      {recent.length > 0 ? (
        <>
          <p className="mt-5 text-[10px] uppercase tracking-widest text-ash">recent (picked up / cancelled)</p>
          <ul className="mt-2 space-y-2 opacity-80">
            {recent.slice(0, 5).map((o) => (
              <OrderRow key={o.id} order={o} onUpdate={update} />
            ))}
          </ul>
        </>
      ) : null}
      {note ? <p className="mt-3 text-xs text-helio">{note}</p> : null}
      <p className="mt-3 text-xs leading-relaxed text-ash">
        Tap <span className="text-cloud">start</span> when you begin making a drink,{" "}
        <span className="text-cloud">ready</span> when it&apos;s at the bar; the guest gets a text.
        Flow: {DRINK_STATUSES.join(" → ")}.
      </p>
    </section>
  );
}
