import { getPlayerToken } from "./player-token";

/** The shape every player action route returns: an outcome plus a guest-facing line. */
export interface ActionResponse {
  ok: boolean;
  say: string;
  data: Record<string, unknown>;
}

async function post(path: string, body?: Record<string, unknown>): Promise<ActionResponse> {
  const token = getPlayerToken();
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const say = typeof data.say === "string" ? data.say : res.ok ? "Done." : "That didn't go through, try again.";
    return { ok: res.ok, say, data };
  } catch {
    return { ok: false, say: "Couldn't reach the game, try again.", data: {} };
  }
}

export function orderDrink(text: string): Promise<ActionResponse> {
  return post("/api/play/drink", { text });
}

export function requestSong(text: string): Promise<ActionResponse> {
  return post("/api/play/song", { text });
}

export function submitMission(text: string): Promise<ActionResponse> {
  return post("/api/play/mission", { text });
}

export function confirmPickup(): Promise<ActionResponse> {
  return post("/api/play/pickup");
}

export function flagHost(reason: string): Promise<ActionResponse> {
  return post("/api/play/flag", { reason });
}
