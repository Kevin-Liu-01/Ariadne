/** Text normalization shared by the drink parser, mission validator, and intent router. */

/** Lowercase, strip punctuation (keep `&`), collapse whitespace. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize and split into word tokens. */
export function tokenize(text: string): string[] {
  const n = normalize(text);
  return n.length === 0 ? [] : n.split(" ");
}

/** True if `needle` appears in `haystack` on word boundaries (both already normalized). */
export function containsPhrase(haystack: string, needle: string): boolean {
  if (needle.length === 0) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}($|\\s)`).test(haystack);
}

/**
 * Last-line guard on the agent's voice: replace any em/en dash (with surrounding
 * spaces) with ", " so a dash never reaches a guest even if the model slips one
 * past the prompt rule. Leaves hyphens in words ("check-in") and line breaks alone.
 */
export function stripDashes(text: string): string {
  return text.replace(/[ \t]*[—–][ \t]*/g, ", ");
}
