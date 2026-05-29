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
