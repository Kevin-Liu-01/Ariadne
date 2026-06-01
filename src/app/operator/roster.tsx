"use client";

import { ChevronDown, Pencil, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GemId } from "@/constants/gems";
import { GemIcon } from "@/components/gem-icon";
import { authedFetch, type OperatorParticipant } from "@/app/operator/api";
import { ParticipantEditor } from "@/app/operator/participant-editor";
import { cn } from "@/lib/utils";

export function Roster({ token }: { token: string }) {
  const [people, setPeople] = useState<OperatorParticipant[]>([]);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<"auth" | "offline" | null>(null);
  const [editing, setEditing] = useState<OperatorParticipant | null>(null);

  const gemCounts = useMemo(() => {
    const counts: Partial<Record<GemId, number>> = {};
    for (const p of people) counts[p.gem] = (counts[p.gem] ?? 0) + 1;
    return counts;
  }, [people]);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/participants");
      if (res.status === 401) {
        setError("auth");
        return;
      }
      if (!res.ok) {
        setError("offline");
        return;
      }
      const data = (await res.json()) as { participants: OperatorParticipant[] };
      setPeople(data.participants);
      setError(null);
      if (data.participants.length > 0) setOpen(true);
    } catch {
      setError("offline");
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <section className="border border-nyx-line bg-nyx-soft p-5">
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

      {error ? (
        <p className="mt-3 text-xs text-red-400">
          {error === "auth" ? "token rejected, lock and re-enter the production token." : "cannot load roster."}
        </p>
      ) : null}

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
                <th className="pb-2 text-right">edit</th>
              </tr>
            </thead>
            <tbody>
              {people.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-sm text-ash">
                    no guests checked in yet.
                  </td>
                </tr>
              ) : (
                people.map((p) => (
                <tr key={p.gameId} className={cn("border-t border-nyx-line/60", p.eliminated && "opacity-50")}>
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
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      aria-label={`edit ${p.gameId}`}
                      className="ml-auto flex items-center gap-1 border border-nyx-line px-2 py-1 text-xs text-ash transition-colors hover:border-helio/50 hover:text-cloud"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                      edit
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {editing ? (
        <ParticipantEditor
          token={token}
          participant={editing}
          gemCounts={gemCounts}
          onClose={() => setEditing(null)}
          onChanged={refresh}
        />
      ) : null}
    </section>
  );
}
