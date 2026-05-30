"use client";

import { useCallback, useEffect, useState } from "react";
import { authedFetch, type OperatorAlert } from "@/app/operator/api";

export function AlertsPanel({ token }: { token: string }) {
  const [alerts, setAlerts] = useState<OperatorAlert[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/alerts");
      if (!res.ok) return;
      const data = (await res.json()) as { alerts: OperatorAlert[] };
      setAlerts(data.alerts);
    } catch {
      // transient; next poll retries
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  async function resolve(id: string) {
    await authedFetch(token, `/api/operator/alerts/${id}`, { method: "PATCH" });
    refresh();
  }

  return (
    <section
      className={`reticle border bg-nyx-soft p-5 ${alerts.length > 0 ? "border-gem-garnet/60" : "border-nyx-line"}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.25em] text-helio">guest alerts</h2>
        <span className="tabular-nums text-xs text-ash">{alerts.length} open</span>
      </div>
      <ul className="mt-4 space-y-2">
        {alerts.length === 0 ? (
          <li className="text-sm text-ash">no alerts — all quiet.</li>
        ) : (
          alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 border border-nyx-line bg-nyx px-4 py-3"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-gem-garnet animate-pulse-slow" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-cloud">{a.reason}</p>
                <p className="text-xs tabular-nums tracking-[0.12em] text-ash">{a.gameId ?? "—"}</p>
              </div>
              <button
                type="button"
                onClick={() => resolve(a.id)}
                className="rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-helio/50"
              >
                resolve
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
