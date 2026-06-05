"use client";

import type { GemId } from "@/constants/gems";

/** Authenticated fetch for the operator console. Token is supplied by the gate. */
export function authedFetch(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body) headers["content-type"] = "application/json";
  return fetch(path, { ...init, headers });
}

export interface OperatorOrder {
  id: string;
  menuItemId: string;
  label: string;
  status: string;
  modifiers: string[];
  rawText: string;
  createdAt: string;
  guest: { gameId: string; displayName: string | null } | null;
}

export interface OperatorAlert {
  id: string;
  gameId: string | null;
  reason: string;
  createdAt: string;
}

export interface OperatorDoorEntry {
  email: string;
  name: string | null;
  checkedIn: boolean;
  gameId: string | null;
  displayName: string | null;
  gemLabel: string | null;
}

export interface OperatorSongRequest {
  id: string;
  rawText: string;
  status: "requested" | "accepted" | "rejected" | "played";
  createdAt: string;
  guest: { gameId: string; displayName: string | null } | null;
}

export interface OperatorAnnouncement {
  id: string;
  body: string;
  recipients: number;
  delivered: number;
  createdAt: string;
}

/** One game in the labyrinth, with this guest's status on it. */
export interface OperatorQuestStage {
  id: string;
  title: string;
  status: string;
}

export interface OperatorParticipant {
  id: string;
  gameId: string;
  displayName: string | null;
  gem: GemId;
  gemLabel: string;
  gemHex: string;
  secretWord: string;
  score: number;
  eliminated: boolean;
  phone: string | null;
  email: string | null;
  /** The game id the guest is currently on (null before the game opens). */
  stage: string | null;
  /** Per-game status, in play order, for the stage toggle. */
  quests: OperatorQuestStage[];
}
