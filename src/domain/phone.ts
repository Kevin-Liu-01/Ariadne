/**
 * Canonicalize a phone number to E.164 so one human maps to one participant no
 * matter how their number arrives: SMS/iMessage ("+17328105793"), a web form
 * ("7328105793"), or a formatted string ("(732) 810-5793"). Applied at every
 * inbound boundary (webhook + web check-in) so storage and lookups always agree.
 *
 * Non-phone handles (an iMessage email address) are passed through lowercased
 * rather than mangled.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`; // bare US 10-digit number
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`; // US, country code, no +
  return `+${digits}`; // best effort for other lengths
}
