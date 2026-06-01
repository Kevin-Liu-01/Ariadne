"use client";

import { ChevronDown, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GemIcon } from "@/components/gem-icon";
import { authedFetch, type OperatorParticipant } from "@/app/operator/api";
import { cn } from "@/lib/utils";

export function Roster({ token }: { token: string }) {
  const [people, setPeople] = useState<OperatorParticipant[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/participants");
      if (!res.ok) return;
      const data = (await res.json()) as { participants: OperatorParticipant[] };
      setPeople(data.participants);
    } catch {
      // transient; next poll retries
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <section className="reticle border border-nyx-line bg-nyx-soft p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
          <Users className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          roster
        </h2>
        <span className="flex items-center gap-1.5 tabular-nums text-xs text-ash">
          {people.length} checked in
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div className="mt-4 max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-ash">
              <tr>
                <th className="pb-2">id</th>
                <th className="pb-2">name</th>
                <th className="pb-2">gem</th>
                <th className="pb-2">word</th>
                <th className="pb-2 text-right">score</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.gameId} className="border-t border-nyx-line/60">
                  <td className="py-2 tabular-nums tracking-[0.12em] text-helio">{p.gameId}</td>
                  <td className="py-2 text-cloud">{p.displayName ?? "n/a"}</td>
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <GemIcon gem={p.gem} size={16} />
                      <span className="text-ash">{p.gemLabel}</span>
                    </span>
                  </td>
                  <td className="py-2 tracking-wide text-ash">{p.secretWord}</td>
                  <td className="py-2 text-right tabular-nums text-cloud">{p.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
