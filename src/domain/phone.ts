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

/**
 * Render an E.164 number for human display: US/NANP numbers (`+1` + 10 digits)
 * become `(+1) 815-997-0034`. Anything else — international, an iMessage email
 * handle, or a malformed value — is returned trimmed-but-unchanged so we never
 * mangle a number we can't confidently group.
 *
 * Display only. `sms:`/`tel:` hrefs and the saved vCard's TEL must keep the raw
 * E.164 from {@link normalizePhone}; dialers and contact saves want the canonical
 * digits, not the prettified string.
 */
export function formatPhoneDisplay(e164: string): string {
  const trimmed = e164.trim();
  if (!trimmed || trimmed.includes("@")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  // US/NANP: an 11-digit `1XXXXXXXXXX` (the E.164 shape) or a bare 10-digit number.
  const national =
    digits.length === 11 && digits.startsWith("1")
      ? digits.slice(1)
      : digits.length === 10
        ? digits
        : null;
  if (!national) return trimmed;

  return `(+1) ${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
}
