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

export function DrinkQueue({ token }: { token: string }) {
  const [active, setActive] = useState<OperatorOrder[]>([]);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/drink-orders");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { active: OperatorOrder[] };
      setActive(data.active);
      setError(false);
    } catch {
      setError(true);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  async function update(id: string, status: string) {
    await authedFetch(token, `/api/operator/drink-orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    refresh();
  }

  return (
    <section className="reticle border border-nyx-line bg-nyx-soft p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
          <Wine className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          bar queue
        </h2>
        <span className="tabular-nums text-xs text-ash">{active.length} open</span>
      </div>
      {error ? <p className="mt-3 text-xs text-red-400">can't reach the queue, check the token.</p> : null}
      <ul className="mt-4 space-y-2">
        {active.length === 0 ? (
          <li className="text-sm text-ash">no orders. quiet bar.</li>
        ) : (
          active.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 border border-nyx-line bg-nyx px-4 py-3"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  o.status === "queued" && "bg-gem-topaz",
                  o.status === "in_progress" && "bg-gem-aquamarine",
                  o.status === "ready" && "bg-gem-peridot animate-pulse-slow",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-cloud">
                  {o.label}
                  {o.modifiers.length > 0 ? (
                    <span className="text-ash"> · {o.modifiers.join(", ")}</span>
                  ) : null}
                </p>
                <p className="text-xs tabular-nums tracking-[0.12em] text-ash">
                  {o.guest?.gameId ?? "?"} {o.guest?.displayName ? `· ${o.guest.displayName}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {(NEXT_ACTIONS[o.status] ?? []).map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    onClick={() => update(o.id, a.status)}
                    className="flex items-center gap-1.5 rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-helio/50"
                  >
                    <a.Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))
        )}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-ash">
        Tap <span className="text-cloud">start</span> when you begin making a drink,{" "}
        <span className="text-cloud">ready</span> when it&apos;s at the bar; the guest gets a text.
        Flow: {DRINK_STATUSES.join(" → ")}.
      </p>
    </section>
  );
}
