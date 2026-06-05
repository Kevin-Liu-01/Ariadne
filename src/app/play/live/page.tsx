"use client";

import { useCallback, useEffect, useState } from "react";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { CheckInCard } from "./check-in-card";
import { LivePlayer } from "./live-player";
import { clearPlayerToken, getPlayerToken } from "./player-token";

/**
 * The web Live Player: the iMessage backup. With a stored token it loads straight
 * into the scene-synced console; without one it shows inline check-in. The token is
 * read on the client only, so the first paint is a neutral loader (no SSR flash).
 */
export default function LivePlayerPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(getPlayerToken());
    setReady(true);
  }, []);

  const onExpire = useCallback(() => {
    clearPlayerToken();
    setToken(null);
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-nyx scanlines">
        <LabyrinthThread size={64} animate />
      </main>
    );
  }

  if (!token) return <CheckInCard onToken={setToken} />;
  return <LivePlayer token={token} onExpire={onExpire} />;
}
