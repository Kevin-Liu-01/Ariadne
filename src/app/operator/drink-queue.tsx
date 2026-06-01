"use client";

import { Check, Hand, Play, Wine, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { DRINK_STATUSES } from "@/constants/drinks";
import { authedFetch, type OperatorOrder } from "@/app/operator/api";
import {
  DRINK_PIPELINE,
  drinkCategoryForLabel,
  drinkCategoryIcon,
  pipelineIndex,
  pipelineLabel,
} from "@/app/operator/drink-visuals";
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

function DrinkPipeline({ status }: { status: string }) {
  const active = pipelineIndex(status);

  return (
    <div className="mt-2 flex gap-1">
      {DRINK_PIPELINE.map((step, i) => (
        <div key={step} className="flex-1">
          <div
            className={cn(
              "h-1 rounded-full transition-colors",
              i <= active ? "bg-helio" : "bg-nyx-line/80",
              status === "ready" && step === "ready" && "animate-pulse-slow bg-gem-peridot",
            )}
          />
          <p
            className={cn(
              "mt-1 text-[9px] uppercase tracking-wider",
              i === active ? "text-cloud" : "text-ash/70",
            )}
          >
            {pipelineLabel(step)}
          </p>
        </div>
      ))}
    </div>
  );
}

function OrderRow({
  order,
  onUpdate,
}: {
  order: OperatorOrder;
  onUpdate: (id: string, status: string) => Promise<void>;
}) {
  const category = drinkCategoryForLabel(order.label);
  const CategoryIcon = drinkCategoryIcon(category);

  return (
    <li className="reticle border border-nyx-line bg-nyx px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
            order.status === "queued" && "border-gem-topaz/50 bg-gem-topaz/10 text-gem-topaz",
            order.status === "in_progress" && "border-gem-aquamarine/50 bg-gem-aquamarine/10 text-gem-aquamarine",
            order.status === "ready" && "border-gem-peridot/60 bg-gem-peridot/15 text-gem-peridot",
            CLOSED.has(order.status) && "border-nyx-line text-ash",
          )}
        >
          <CategoryIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-cloud">{order.label}</p>
            <span className="text-[10px] uppercase tracking-widest text-ash">{category.replace("_", " ")}</span>
          </div>
          {order.modifiers.length > 0 ? (
            <p className="text-xs text-ash">mods · {order.modifiers.join(", ")}</p>
          ) : null}
          <p className="text-xs tabular-nums tracking-[0.12em] text-ash">
            {order.guest?.gameId ?? "?"} {order.guest?.displayName ? `· ${order.guest.displayName}` : ""}
            {CLOSED.has(order.status) ? ` · ${order.status.replace("_", " ")}` : ""}
          </p>
          {!CLOSED.has(order.status) ? <DrinkPipeline status={order.status} /> : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {(NEXT_ACTIONS[order.status] ?? []).map((a) => (
            <button
              key={a.status}
              type="button"
              onClick={() => onUpdate(order.id, a.status)}
              className="flex items-center gap-1.5 rounded-md border border-nyx-line px-3 py-1.5 text-xs text-cloud hover:border-helio/50"
            >
              <a.Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

export function DrinkQueue({ token }: { token: string }) {
  const [active, setActive] = useState<OperatorOrder[]>([]);
  const [recent, setRecent] = useState<OperatorOrder[]>([]);
  const [error, setError] = useState<"auth" | "offline" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const counts = { queued: 0, in_progress: 0, ready: 0 };
    for (const o of active) {
      if (o.status in counts) counts[o.status as keyof typeof counts] += 1;
    }
    return counts;
  }, [active]);

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
    <section className="reticle border border-nyx-line bg-nyx-soft/90 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
          <Wine className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          bar queue
        </h2>
        <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-widest text-ash">
          <span className="text-gem-topaz">{statusCounts.queued} queued</span>
          <span className="text-gem-aquamarine">{statusCounts.in_progress} making</span>
          <span className="text-gem-peridot">{statusCounts.ready} ready</span>
        </div>
      </div>
      {errorCopy ? <p className="mt-3 text-xs text-red-400">{errorCopy}</p> : null}
      <ul className="mt-4 space-y-3">
        {active.length === 0 && !error ? (
          <li className="text-sm text-ash">no open orders. quiet bar.</li>
        ) : (
          active.map((o) => <OrderRow key={o.id} order={o} onUpdate={update} />)
        )}
      </ul>
      {recent.length > 0 ? (
        <>
          <p className="mt-5 text-[10px] uppercase tracking-widest text-ash">recent (picked up / cancelled)</p>
          <ul className="mt-2 space-y-2 opacity-75">
            {recent.slice(0, 6).map((o) => (
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
