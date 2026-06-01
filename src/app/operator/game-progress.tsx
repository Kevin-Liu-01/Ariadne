"use client";

import { Crown, Target } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MISSIONS } from "@/constants/missions";
import { GemIcon } from "@/components/gem-icon";
import { authedFetch, type OperatorParticipant } from "@/app/operator/api";
import { cn } from "@/lib/utils";

const MAX_MISSION_POINTS = MISSIONS.reduce((sum, m) => sum + m.points, 0);

export function GameProgress({ token }: { token: string }) {
  const [people, setPeople] = useState<OperatorParticipant[]>([]);
  const [error, setError] = useState<"auth" | "offline" | null>(null);

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
    } catch {
      setError("offline");
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const ranked = useMemo(
    () => [...people].sort((a, b) => b.score - a.score || a.gameId.localeCompare(b.gameId)),
    [people],
  );

  const topScore = ranked[0]?.score ?? 0;
  const gemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of people) counts.set(p.gem, (counts.get(p.gem) ?? 0) + 1);
    return counts;
  }, [people]);

  const totalScore = ranked.reduce((sum, p) => sum + p.score, 0);
  const avgScore = people.length > 0 ? Math.round(totalScore / people.length) : 0;

  return (
    <section className="reticle border border-nyx-line bg-nyx-soft p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
          <Target className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          game progress
        </h2>
        <span className="text-xs tabular-nums text-ash">
          {people.length} players · avg {avgScore} pts
        </span>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-400">
          {error === "auth" ? "token rejected." : "cannot load leaderboard."}
        </p>
      ) : null}

      {ranked.length === 0 && !error ? (
        <p className="mt-4 text-sm text-ash">no scores yet. first check-in sets the board.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {ranked.slice(0, 8).map((p, i) => (
            <li key={p.gameId} className="border border-nyx-line/70 bg-nyx px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex w-6 items-center justify-center text-[10px] tabular-nums text-ash">
                  {i === 0 ? <Crown className="h-3.5 w-3.5 text-helio" strokeWidth={1.5} aria-hidden /> : `#${i + 1}`}
                </span>
                <GemIcon gem={p.gem} size={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-cloud">
                    {p.displayName ?? p.gameId}
                    <span className="ml-2 text-xs tracking-[0.12em] text-ash">{p.gameId}</span>
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-nyx-line/60">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        i === 0 ? "bg-helio" : "bg-gem-aquamarine/80",
                      )}
                      style={{
                        width: `${topScore > 0 ? Math.max(8, (p.score / topScore) * 100) : 8}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="tabular-nums text-lg text-cloud">{p.score}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-nyx-line/60 pt-4">
        <p className="text-[10px] uppercase tracking-widest text-ash">gem spread</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[...gemCounts.entries()].map(([gem, count]) => (
            <span
              key={gem}
              className="flex items-center gap-1.5 border border-nyx-line px-2 py-1 text-xs text-ash"
            >
              <GemIcon gem={gem as OperatorParticipant["gem"]} size={14} />
              {count}
            </span>
          ))}
          {gemCounts.size === 0 ? <span className="text-xs text-ash">waiting for gems</span> : null}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ash">
          {MISSIONS.length} missions in the labyrinth · {MAX_MISSION_POINTS} max points if every thread
          completes.
        </p>
      </div>
    </section>
  );
}
