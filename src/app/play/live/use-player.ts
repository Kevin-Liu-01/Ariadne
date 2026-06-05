"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/server/play/player-service";

export interface PlayerState {
  view: PlayerView | null;
  error: string | null;
  loading: boolean;
  /** True once the token is rejected, so the screen can fall back to check-in. */
  expired: boolean;
}

const POLL_MS = 2000;

/**
 * Polls /api/play/me so the screen mirrors the room (scene, score, queue status)
 * Kahoot-style. Responses from superseded requests are discarded via a sequence
 * ref, and a transient error never blanks a good last view.
 */
export function usePlayer(token: string | null): PlayerState & { refresh: () => Promise<void> } {
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!token) return;
    const mine = ++seq.current;
    try {
      const res = await fetch("/api/play/me", { headers: { authorization: `Bearer ${token}` } });
      if (mine !== seq.current) return; // a newer poll already landed
      if (res.status === 401 || res.status === 404) {
        setExpired(true);
        return;
      }
      if (!res.ok) {
        setError("reconnecting...");
        return;
      }
      const data = (await res.json()) as PlayerView;
      if (mine !== seq.current) return;
      setView(data);
      setError(null);
    } catch {
      if (mine === seq.current) setError("reconnecting...");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [token, load]);

  return { view, error, loading, expired, refresh: load };
}
