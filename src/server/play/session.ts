import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Stateless identity for the web Live Player: a participant id signed with the
 * player secret, stored in the browser and presented as a bearer token. No DB
 * session row; the participant row is the canonical state, the token only proves
 * which participant the browser is. Mirrors the webhook rule: no secret, no trust.
 *
 * Token shape: `<participantId>.<issuedAtMs>.<hmacHex>`, the signature taken over
 * `<participantId>.<issuedAtMs>` so the id cannot be swapped under a stolen
 * signature. Participant ids are `par_<hex>` (no dots), so split-on-dot is exact.
 */
function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function signPlayerToken(participantId: string): string {
  const body = `${participantId}.${Date.now()}`;
  return `${body}.${sign(body, env.playerSecret)}`;
}

/** Verify a token and return the participant id, or null if it is invalid or unsigned. */
export function verifyPlayerToken(token: string): string | null {
  const secret = env.playerSecret;
  if (!secret) return null; // fail closed: no key configured

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [participantId, issuedAt, signature] = parts;
  if (!participantId || !issuedAt || !signature) return null;

  const expected = sign(`${participantId}.${issuedAt}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? participantId : null;
}
