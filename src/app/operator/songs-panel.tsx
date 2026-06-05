"use client";

import { Check, Music, Play, Tablet, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { authedFetch, type OperatorSongRequest } from "@/app/operator/api";
import { cn } from "@/lib/utils";

type SongStatus = OperatorSongRequest["status"];

const STATUS_TINT: Record<SongStatus, string> = {
  requested: "text-helio",
  accepted: "text-gem-peridot",
  played: "text-ash",
  rejected: "text-gem-garnet",
};

interface SongAction {
  label: string;
  status: Exclude<SongStatus, "requested">;
  Icon: LucideIcon;
  tone: "go" | "stop";
}

// Contextual next moves per status; delete is always available alongside these.
const ACTIONS: Record<SongStatus, SongAction[]> = {
  requested: [
    { label: "accept", status: "accepted", Icon: Check, tone: "go" },
    { label: "pass", status: "rejected", Icon: X, tone: "stop" },
  ],
  accepted: [
    { label: "played", status: "played", Icon: Play, tone: "go" },
    { label: "pass", status: "rejected", Icon: X, tone: "stop" },
  ],
  rejected: [{ label: "accept", status: "accepted", Icon: Check, tone: "go" }],
  played: [],
};

function guestName(s: OperatorSongRequest): string {
  return s.guest?.displayName ?? s.guest?.gameId ?? "Guest";
}

/** Operator song queue: accept (texts the guest), pass, mark played, or delete. */
export function SongsPanel({ token }: { token: string }) {
  const [songs, setSongs] = useState<OperatorSongRequest[]>([]);
  const [note, setNote] = useState<string | null>(null);

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

  const flash = useCallback((msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2500);
  }, []);

  const decide = useCallback(
    async (id: string, status: SongAction["status"]) => {
      const res = await authedFetch(token, `/api/operator/song-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      flash(
        !res.ok
          ? "update failed, try again"
          : status === "accepted"
            ? "accepted, guest texted"
            : `marked ${status}`,
      );
      if (res.ok) refresh();
    },
    [token, refresh, flash],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await authedFetch(token, `/api/operator/song-requests/${id}`, { method: "DELETE" });
      flash(res.ok ? "request removed" : "delete failed, try again");
      if (res.ok) refresh();
    },
    [token, refresh, flash],
  );

  const pending = songs.filter((s) => s.status === "requested").length;

  return (
    <section className="border border-nyx-line bg-nyx-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
          <Music className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          song requests
        </h2>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-ash">
          <span className="text-helio">{pending} pending</span>
          <Link
            href="/dj"
            target="_blank"
            className="flex items-center gap-1.5 border border-nyx-line px-2 py-1 text-ash transition-colors hover:border-helio/50 hover:text-cloud"
          >
            <Tablet className="h-3 w-3" strokeWidth={1.5} aria-hidden />
            dj display
          </Link>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {songs.length === 0 ? (
          <li className="text-sm text-ash">no song requests yet.</li>
        ) : (
          songs.slice(0, 12).map((s) => (
            <li
              key={s.id}
              className={cn(
                "flex flex-wrap items-center gap-3 border border-nyx-line bg-nyx px-4 py-2.5",
                s.status === "rejected" && "opacity-60",
              )}
            >
              <Music className="h-3.5 w-3.5 shrink-0 text-ash" strokeWidth={1.5} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate", s.status === "rejected" ? "text-ash line-through" : "text-cloud")}>
                  {s.rawText}
                </p>
                <p className="truncate text-xs tracking-[0.12em] text-ash">{guestName(s)}</p>
              </div>
              <span className={cn("shrink-0 text-[10px] uppercase tracking-[0.2em]", STATUS_TINT[s.status])}>
                {s.status}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {ACTIONS[s.status].map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    onClick={() => void decide(s.id, a.status)}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                      a.tone === "go"
                        ? "border-nyx-line text-cloud hover:border-gem-peridot/70"
                        : "border-nyx-line text-ash hover:border-gem-garnet/70 hover:text-cloud",
                    )}
                  >
                    <a.Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    {a.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void remove(s.id)}
                  aria-label="delete request"
                  className="flex items-center justify-center rounded-md border border-nyx-line px-2 py-1 text-ash transition-colors hover:border-gem-garnet/70 hover:text-gem-garnet"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {note ? <p className="mt-3 text-xs text-helio">{note}</p> : null}
      <p className="mt-3 text-xs leading-relaxed text-ash">
        <span className="text-cloud">Accept</span> texts the guest it&apos;s coming;{" "}
        <span className="text-cloud">pass</span> is silent. The DJ display mirrors this queue.
      </p>
    </section>
  );
}
