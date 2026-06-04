import { CLUES, type Clue } from "@/constants/clues";
import type { GemId } from "@/constants/gems";
import { COLOR_COMBOS, WORD_PAIRS } from "@/constants/missions";
import { tokenize } from "@/domain/text";

const COLOR_COMBO_KEYS = new Set(COLOR_COMBOS.map((c) => [...c].sort().join(",")));

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

/**
 * True if a group's gems form a valid color-quest combination: an exact listed
 * combo, or the "two purples (amethyst) + one of another color" rule.
 */
export function isValidColorCombo(gems: readonly GemId[]): boolean {
  if (gems.length < 2) return false;
  if (COLOR_COMBO_KEYS.has([...gems].sort().join(","))) return true;
  if (gems.length === 3) {
    const amethyst = gems.filter((g) => g === "amethyst").length;
    return amethyst === 2;
  }
  return false;
}

/**
 * Deterministically assign 3 distinct riddles to a guest from the pool of 8,
 * stable across calls (no stored state) so the same guest always gets the same
 * three. A linear-congruential walk seeded by the game id picks distinct indices.
 */
export function riddlesForParticipant(gameId: string, count = 3): Clue[] {
  let seed = 0;
  for (const ch of gameId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const picks: Clue[] = [];
  const used = new Set<number>();
  let h = seed || 1;
  while (picks.length < Math.min(count, CLUES.length)) {
    h = (h * 1103515245 + 12345) >>> 0;
    const idx = h % CLUES.length;
    if (used.has(idx)) continue;
    used.add(idx);
    picks.push(CLUES[idx]);
  }
  return picks;
}

/** Find which of a guest's assigned riddles a message answers (by id), if any. */
export function matchRiddleAnswer(riddles: readonly Clue[], normalizedText: string): Clue | null {
  for (const r of riddles) {
    if (r.answers.some((a) => containsRiddleAnswer(normalizedText, a))) return r;
  }
  return null;
}

function containsRiddleAnswer(normalizedText: string, answer: string): boolean {
  const tokens = normalizedText.split(/\s+/u).filter(Boolean);
  const target = answer.toLowerCase().replace(/[^a-z0-9]+/gu, "");
  return tokens.some((t) => t.replace(/[^a-z0-9]+/gu, "") === target);
}
