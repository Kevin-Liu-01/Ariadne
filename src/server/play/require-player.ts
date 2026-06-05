import { verifyPlayerToken } from "@/server/play/session";

/**
 * Resolve the player behind a request from its `Authorization: Bearer <token>`
 * header, or null when the token is missing or invalid. Routes turn null into 401.
 */
export function requirePlayer(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  return verifyPlayerToken(token);
}
