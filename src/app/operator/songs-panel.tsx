"use client";

import { Music } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authedFetch, type OperatorSongRequest } from "@/app/operator/api";
import { cn } from "@/lib/utils";

const STATUS_TINT: Record<OperatorSongRequest["status"], string> = {
  requested: "text-helio",
  accepted: "text-gem-peridot",
  played: "text-ash",
  rejected: "text-gem-garnet line-through",
};

function guestName(s: OperatorSongRequest): string {
  return s.guest?.displayName ?? s.guest?.gameId ?? "Guest";
}

/** Read-only view of the song queue. The DJ screen accepts or rejects; this is for awareness. */
export function SongsPanel({ token }: { token: string }) {
  const [songs, setSongs] = useState<OperatorSongRequest[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/song-requests");
      if (!res.ok) return;
      const data = (await res.json()) as { requests: OperatorSongRequest[] };
      setSongs(data.requests);
    } catch {
      // non-critical panel
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const pending = songs.filter((s) => s.status === "requested").length;

  return (
    <section className="border border-nyx-line bg-nyx-soft p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
          <Music className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          song requests
        </h2>
        <span className="tabular-nums text-xs text-ash">{pending} pending</span>
      </div>
      <ul className="mt-4 space-y-2">
        {songs.length === 0 ? (
          <li className="text-sm text-ash">no song requests yet.</li>
        ) : (
          songs.slice(0, 8).map((s) => (
            <li key={s.id} className="flex items-center gap-3 border border-nyx-line bg-nyx px-4 py-2.5">
              <Music className="h-3.5 w-3.5 shrink-0 text-ash" strokeWidth={1.5} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-cloud">{s.rawText}</p>
                <p className="truncate text-xs tracking-[0.12em] text-ash">{guestName(s)}</p>
              </div>
              <span className={cn("shrink-0 text-[10px] uppercase tracking-[0.2em]", STATUS_TINT[s.status])}>
                {s.status}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
