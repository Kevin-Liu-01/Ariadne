/**
 * Detect when a guest is explicitly asking for Ariadne's contact ("send me your
 * contact", "what's your number", "vcard"). The contact card is a deterministic
 * side effect, so deciding to attach it stays in code, never the LLM: when this
 * returns true the reply rides out with the vCard attached (see deliverGuestReply),
 * so the "save it from the card above" promise is always backed by a real card.
 *
 * Matches our own contact only. A possessive ("your/ur contact") or an explicit
 * contact-card noun is required, so "I lost my contact lens" or "contact a host"
 * never trip it. Errs toward sending: a redundant card is harmless, a missing one
 * is the bug we are fixing.
 */
const CONTACT_REQUEST =
  /\b(?:v-?card|(?:your|ur|yours)\s+(?:contact|number|digits|info)|contact\s+(?:card|info|details|information))\b/i;

export function isContactCardRequest(text: string): boolean {
  return CONTACT_REQUEST.test(text.trim());
}
