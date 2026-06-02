/** Email helpers for the waitlist door gate. */

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Pull the first email out of a free-text message (the guest may add words around it). */
export function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_RE);
  return match ? normalizeEmail(match[0]) : null;
}
