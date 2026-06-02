"use client";

import { Check, LogOut, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EVENT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { authedFetch, type OperatorDoorEntry } from "@/app/operator/api";
import { cn } from "@/lib/utils";

/** Door roster for guards: search a waitlist email, see if they are approved and checked in. */
export function DoorBoard({ token, onLock }: { token: string; onLock: () => void }) {
  const [entries, setEntries] = useState<OperatorDoorEntry[]>([]);
  const [checkedIn, setCheckedIn] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<"auth" | "offline" | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/door");
      if (res.status === 401) return setError("auth");
      if (!res.ok) return setError("offline");
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
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.email.includes(q) || (e.name ?? "").toLowerCase().includes(q) || (e.gameId ?? "").toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <main className="relative flex min-h-dvh flex-col bg-nyx scanlines">
      <header className="relative z-[2] flex items-center justify-between gap-4 border-b border-nyx-line px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <LabyrinthThread size={30} />
          <div>
            <p className="flex items-center gap-1.5 font-display text-lg font-extralight tracking-tight text-cloud">
              <ShieldCheck className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
              Door
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-ash">{EVENT_NAME}</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-right">
            <span className="block text-xl tabular-nums text-cloud">
              {checkedIn}
              <span className="text-ash">/{entries.length}</span>
            </span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-ash">checked in</span>
          </span>
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

      <div className="relative z-[2] flex flex-1 flex-col gap-3 p-3 sm:p-5">
        <label className="flex items-center gap-3 border border-nyx-line bg-nyx-soft/80 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-ash" strokeWidth={1.5} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search an email, name, or game id"
            className="w-full bg-transparent text-lg text-cloud outline-none placeholder:text-ash/60"
          />
        </label>

        {error === "auth" ? (
          <p className="border border-gem-garnet/40 bg-gem-garnet/10 px-4 py-3 text-center text-sm text-cloud">
            Token rejected. Re-open this screen with the staff token.
          </p>
        ) : null}

        <ul className="flex-1 space-y-2 overflow-auto">
          {filtered.length === 0 ? (
            <li className="py-12 text-center text-sm text-ash">no match on the list.</li>
          ) : (
            filtered.map((e) => (
              <li
                key={e.email}
                className={cn(
                  "flex items-center gap-3 border px-4 py-3",
                  e.checkedIn ? "border-gem-peridot/40 bg-gem-peridot/5" : "border-nyx-line bg-nyx-soft/60",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs",
                    e.checkedIn
                      ? "border-gem-peridot/60 text-gem-peridot"
                      : "border-nyx-line text-ash/50",
                  )}
                >
                  {e.checkedIn ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-cloud">{e.name ?? e.displayName ?? e.email}</p>
                  <p className="truncate text-xs text-ash">{e.email}</p>
                </div>
                {e.checkedIn ? (
                  <div className="shrink-0 text-right">
                    <p className="text-xs uppercase tracking-[0.15em] text-gem-peridot">in</p>
                    <p className="text-[11px] tabular-nums tracking-[0.12em] text-ash">
                      {e.gameId}
                      {e.gemLabel ? ` · ${e.gemLabel}` : ""}
                    </p>
                  </div>
                ) : (
                  <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-ash/60">approved</span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}
