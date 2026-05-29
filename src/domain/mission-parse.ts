import { WORD_PAIRS } from "@/constants/missions";
import { tokenize } from "@/domain/text";

/**
 * Liberally extract candidate game IDs from a message. Over-extraction is safe:
 * the mission validator only accepts IDs that resolve to checked-in participants.
 */
export function extractGameIds(text: string): string[] {
  const tokens = text.toUpperCase().split(/[^A-Z0-9]+/u).filter(Boolean);
  const candidates = tokens.filter((t) => /^[A-Z0-9]{3,6}$/u.test(t));
  return [...new Set(candidates)];
}

/** All words that complete a known phrase with `word` (order-independent). */
export function complementsOf(word: string): string[] {
  const w = word.toLowerCase();
  const out = new Set<string>();
  for (const [a, b] of WORD_PAIRS) {
    if (a === w) out.add(b);
    if (b === w) out.add(a);
  }
  return [...out];
}

/** True if `a` and `b` form a known phrase pair (either order). */
export function wordsPair(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return WORD_PAIRS.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
}

/** True if the message text mentions a given secret word as a token. */
export function mentionsWord(text: string, word: string): boolean {
  return tokenize(text).includes(word.toLowerCase());
}
