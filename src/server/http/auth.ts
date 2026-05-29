import { timingSafeEqual } from "node:crypto";

/** Constant-time bearer-token check against an expected secret. */
export function bearerOk(req: Request, expected: string): boolean {
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token.length === 0) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
