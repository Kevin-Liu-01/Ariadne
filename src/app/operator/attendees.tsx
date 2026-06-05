"use client";

import { Check, ChevronDown, Search, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authedFetch, type OperatorDoorEntry } from "@/app/operator/api";
import { filterDoorEntries } from "@/app/operator/door-entries";
import { cn } from "@/lib/utils";

/**
 * The approved waitlist (valid attendees) and which of them have checked in.
 * Mirrors the door board's data over the same /api/operator/door feed, rendered
 * as a collapsible console panel alongside the checked-in roster.
 */
export function Attendees({ token }: { token: string }) {
  const [entries, setEntries] = useState<OperatorDoorEntry[]>([]);
  const [checkedIn, setCheckedIn] = useState(0);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<"auth" | "offline" | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/door");
      if (res.status === 401) {
        setError("auth");
        return;
      }
      if (!res.ok) {
        setError("offline");
        return;
      }
      const data = (await res.json()) as { entries: OperatorDoorEntry[]; checkedIn: number };
      setEntries(data.entries);
      setCheckedIn(data.checkedIn);
      setError(null);
    } catch {
      setError("offline");
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const filtered = useMemo(() => filterDoorEntries(entries, query), [entries, query]);

  return (
    <section className="border border-nyx-line bg-nyx-soft p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
          <UserCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          attendees
        </h2>
        <span className="flex items-center gap-1.5 tabular-nums text-xs text-ash">
          {checkedIn}/{entries.length} checked in
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      </button>

      {error ? (
        <p className="mt-3 text-xs text-red-400">
          {error === "auth"
            ? "token rejected, lock and re-enter the production token."
            : "cannot load attendees."}
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2.5 border border-nyx-line bg-nyx px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ash" strokeWidth={1.5} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search an email, name, or game id"
              className="w-full bg-transparent text-sm text-cloud outline-none placeholder:text-ash/60"
            />
          </label>

          <ul className="max-h-80 space-y-2 overflow-auto">
            {filtered.length === 0 ? (
              <li className="py-6 text-center text-sm text-ash">
                {entries.length === 0 ? "no approved attendees yet." : "no match on the list."}
              </li>
            ) : (
              filtered.map((e) => (
                <li
                  key={e.email}
                  className={cn(
                    "flex items-center gap-3 border px-3 py-2.5",
                    e.checkedIn ? "border-gem-peridot/40 bg-gem-peridot/5" : "border-nyx-line bg-nyx",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs",
                      e.checkedIn ? "border-gem-peridot/60 text-gem-peridot" : "border-nyx-line text-ash/50",
                    )}
                  >
                    {e.checkedIn ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> : "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cloud">{e.name ?? e.displayName ?? e.email}</p>
                    <p className="truncate text-xs text-ash">{e.email}</p>
                  </div>
                  {e.checkedIn ? (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-gem-peridot">in</p>
                      <p className="text-[11px] tabular-nums tracking-[0.12em] text-ash">
                        {e.gameId}
                        {e.gemLabel ? ` · ${e.gemLabel}` : ""}
                      </p>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-ash/60">approved</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
