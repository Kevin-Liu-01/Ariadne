/** Email helpers. Email is kept as optional metadata on a participant, not a gate. */

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
