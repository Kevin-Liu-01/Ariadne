"use client";

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

export interface OperatorParticipant {
  gameId: string;
  displayName: string | null;
  gemLabel: string;
  gemHex: string;
  secretWord: string;
  score: number;
  eliminated: boolean;
  phone: string | null;
}
