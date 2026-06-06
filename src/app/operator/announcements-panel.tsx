"use client";

import { Megaphone, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authedFetch, type OperatorAnnouncement } from "@/app/operator/api";
import { cn } from "@/lib/utils";

const MAX = 600;

interface SendResult {
  recipients: number;
  delivered: number;
  skippedPaused: number;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Type a message and broadcast it to everyone who has texted the line, checked in or not (paused guests excluded). */
export function AnnouncementsPanel({ token }: { token: string }) {
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<OperatorAnnouncement[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/announcements");
      if (!res.ok) return;
      const data = (await res.json()) as { announcements: OperatorAnnouncement[] };
      setRecent(data.announcements);
    } catch {
      // history is non-critical; the composer still works offline-of-history
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = useCallback(async () => {
    setConfirming(false);
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await authedFetch(token, "/api/operator/announcements", {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "token rejected" : "send failed");
        return;
      }
      const data = (await res.json()) as SendResult;
      setResult(data);
      setBody("");
      await refresh();
    } catch {
      setError("send failed");
    } finally {
      setSending(false);
    }
  }, [token, body, refresh]);

  const removeRecent = useCallback(
    async (id: string) => {
      // Optimistic: drop it locally, then reconcile from the server.
      setRecent((prev) => prev.filter((a) => a.id !== id));
      await authedFetch(token, `/api/operator/announcements/${id}`, { method: "DELETE" });
      await refresh();
    },
    [token, refresh],
  );

  const trimmed = body.trim();

  return (
    <section className="border border-nyx-line bg-nyx-soft p-5">
      <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
        <Megaphone className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        announce to the room
      </h2>
      <p className="mt-2 text-xs text-ash">
        Texts everyone who has messaged the line, checked in or not. Guests who replied STOP are skipped.
      </p>

      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value.slice(0, MAX));
          setConfirming(false);
        }}
        rows={3}
        placeholder="Showcase starts in 5 minutes. Head to the runway."
        className="mt-3 w-full resize-y border border-nyx-line bg-nyx px-3 py-2 text-sm text-cloud outline-none focus:border-helio/50"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[10px] tabular-nums text-ash">
          {body.length}/{MAX}
        </span>
        {confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-xs text-ash">Send to all guests?</span>
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="flex items-center gap-1.5 bg-helio px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-nyx disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-2 py-1.5 text-xs uppercase tracking-widest text-ash"
            >
              cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!trimmed || sending}
            className={cn(
              "flex items-center gap-1.5 border border-nyx-line px-3 py-1.5 text-xs uppercase tracking-widest text-cloud transition-colors",
              trimmed && !sending ? "hover:border-helio/50" : "opacity-40",
            )}
          >
            <Megaphone className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {sending ? "sending..." : "send announcement"}
          </button>
        )}
      </div>

      {result ? (
        <p className="mt-3 text-xs text-gem-peridot">
          Sent to {result.delivered}/{result.recipients} guests
          {result.skippedPaused > 0 ? ` (${result.skippedPaused} paused, skipped)` : ""}.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-xs text-gem-garnet">{error}</p> : null}

      {recent.length > 0 ? (
        <div className="mt-4 border-t border-nyx-line/60 pt-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ash">recent</p>
          <ul className="mt-2 space-y-2">
            {recent.slice(0, 5).map((a) => (
              <li key={a.id} className="group flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0 text-[10px] tabular-nums text-ash">{timeLabel(a.createdAt)}</span>
                <span className="min-w-0 flex-1 text-cloud">{a.body}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-ash">
                  {a.delivered}/{a.recipients}
                </span>
                <button
                  type="button"
                  onClick={() => void removeRecent(a.id)}
                  aria-label="delete announcement"
                  className="shrink-0 text-ash/60 transition-colors hover:text-gem-garnet"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
