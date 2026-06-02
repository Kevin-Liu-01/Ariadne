"use client";

import { Check, Disc3, LogOut, Music, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EVENT_NAME } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { authedFetch, type OperatorSongRequest } from "@/app/operator/api";
import { cn } from "@/lib/utils";

function guestName(request: OperatorSongRequest): string {
  return request.guest?.displayName ?? request.guest?.gameId ?? "Guest";
}

function RequestCard({
  request,
  busy,
  onDecide,
}: {
  request: OperatorSongRequest;
  busy: boolean;
  onDecide: (status: "accepted" | "rejected") => void;
}) {
  return (
    <li className="border border-nyx-line bg-nyx-soft/80 p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-nyx-line/70 text-helio">
          <Music className="h-7 w-7" strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xl font-semibold leading-tight text-cloud">{request.rawText}</p>
          <p className="mt-1 truncate text-base text-ash">
            from <span className="font-medium text-cloud">{guestName(request)}</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onDecide("accepted")}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 bg-gem-peridot py-4 text-lg font-bold uppercase tracking-wide text-nyx transition-opacity disabled:opacity-50"
        >
          <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
          Accept
        </button>
        <button
          type="button"
          onClick={() => onDecide("rejected")}
          disabled={busy}
          className="flex w-32 items-center justify-center gap-2 border border-gem-garnet/60 py-4 text-base font-semibold uppercase tracking-wide text-gem-garnet transition-colors hover:bg-gem-garnet/10 disabled:opacity-50"
        >
          <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Pass
        </button>
      </div>
    </li>
  );
}

/** The DJ display: incoming requests to accept or pass, and the accepted queue. */
export function DjBoard({ token, onLock }: { token: string; onLock: () => void }) {
  const [requests, setRequests] = useState<OperatorSongRequest[]>([]);
  const [error, setError] = useState<"auth" | "offline" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/song-requests");
      if (res.status === 401) return setError("auth");
      if (!res.ok) return setError("offline");
      const data = (await res.json()) as { requests: OperatorSongRequest[] };
      setRequests(data.requests);
      setError(null);
    } catch {
      setError("offline");
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const decide = useCallback(
    async (id: string, status: "accepted" | "rejected" | "played") => {
      setBusyId(id);
      try {
        const res = await authedFetch(token, `/api/operator/song-requests/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        if (res.ok) await refresh();
        else setError(res.status === 401 ? "auth" : "offline");
      } catch {
        setError("offline");
      } finally {
        setBusyId(null);
      }
    },
    [token, refresh],
  );

  const { pending, queue } = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "requested"),
      queue: requests.filter((r) => r.status === "accepted"),
    }),
    [requests],
  );

  return (
    <main className="relative flex min-h-dvh flex-col bg-nyx scanlines">
      <header className="relative z-[2] flex items-center justify-between gap-4 border-b border-nyx-line px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <LabyrinthThread size={30} />
          <div>
            <p className="font-display text-lg font-extralight tracking-tight text-cloud">DJ</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-ash">{EVENT_NAME}</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-right">
            <span className="block text-xl tabular-nums text-cloud">{pending.length}</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-ash">requests</span>
          </span>
          <span
            className={cn("h-2.5 w-2.5 rounded-full", error ? "bg-gem-garnet" : "bg-gem-peridot animate-pulse-slow")}
            title={error ? "reconnecting" : "live"}
          />
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

      {error === "auth" ? (
        <p className="relative z-[2] border-b border-gem-garnet/40 bg-gem-garnet/10 px-4 py-3 text-center text-sm text-cloud sm:px-6">
          Token rejected. Ask staff to reopen this display.
        </p>
      ) : null}

      <div className="relative z-[2] grid flex-1 gap-3 p-3 sm:p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col">
          <h2 className="flex items-center gap-2 px-1 pb-3 text-sm uppercase tracking-[0.25em] text-helio">
            <Disc3 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            incoming
          </h2>
          <ul className="flex-1 space-y-3 overflow-auto">
            {pending.length === 0 ? (
              <li className="py-12 text-center text-sm text-ash">no requests right now. the floor is yours.</li>
            ) : (
              pending.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  busy={busyId === r.id}
                  onDecide={(status) => decide(r.id, status)}
                />
              ))
            )}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col border border-nyx-line/70 bg-nyx-soft/30">
          <div className="flex items-center justify-between border-b border-nyx-line/70 px-4 py-3">
            <span className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-gem-peridot">
              <Play className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              queue
            </span>
            <span className="text-lg tabular-nums text-ash">{queue.length}</span>
          </div>
          <ul className="flex-1 space-y-2 overflow-auto p-3">
            {queue.length === 0 ? (
              <li className="py-8 text-center text-sm text-ash">accepted songs land here</li>
            ) : (
              queue.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border border-gem-peridot/30 bg-nyx px-3 py-2.5">
                  <Music className="h-4 w-4 shrink-0 text-gem-peridot" strokeWidth={1.5} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cloud">{r.rawText}</p>
                    <p className="truncate text-[10px] uppercase tracking-[0.15em] text-ash">{guestName(r)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => decide(r.id, "played")}
                    disabled={busyId === r.id}
                    className="shrink-0 border border-nyx-line px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-ash transition-colors hover:border-helio/50 hover:text-cloud disabled:opacity-50"
                  >
                    played
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
