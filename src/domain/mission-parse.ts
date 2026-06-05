import { CLUES, type Clue } from "@/constants/clues";
import type { GemId } from "@/constants/gems";
import { isValidColorTriangle } from "@/domain/gem-wheel";
import { MISSIONS, WORD_PAIRS, type MissionTemplate } from "@/constants/missions";
import { normalize, tokenize } from "@/domain/text";

/**
 * Liberally extract candidate game IDs from a message. Over-extraction is safe:
 * the mission validator only accepts IDs that resolve to checked-in participants.
 */
export function extractGameIds(text: string): string[] {
  const tokens = text.toUpperCase().split(/[^A-Z0-9]+/u).filter(Boolean);
  const candidates = tokens.filter((t) => /^[A-Z0-9]{3,6}$/u.test(t));
  return [...new Set(candidates)];
}

/** Lowercase, strip every non-alphanumeric char so spacing/punctuation/case can't dodge a match. */
function collapse(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

/**
 * The game whose staff skip-phrase this message carries, if any. Matched as a
 * collapsed substring so "labyrinth-prism", "LABYRINTH PRISM", and "use labyrinth
 * prism now" all resolve; the codes are distinctive enough that no normal answer
 * collides. Pass/fail stays deterministic: a code is a deliberate bypass, never a solve.
 */
export function matchBypassCode(text: string): MissionTemplate | null {
  const haystack = collapse(text);
  if (!haystack) return null;
  return MISSIONS.find((m) => haystack.includes(collapse(m.bypassCode))) ?? null;
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

/** True if the three gems (yours plus two others) form a primary or secondary wheel triangle. */
export function isValidColorCombo(gems: readonly GemId[]): boolean {
  return isValidColorTriangle(gems);
}

/** Deterministically assign one labyrinth clue to a guest by game id (stable, no stored state). */
export function clueForParticipant(gameId: string): Clue {
  let hash = 0;
  for (const ch of gameId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CLUES[hash % CLUES.length];
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

/** A guest's riddle reply, split into the riddle number they filed it under (if any) and the answer text. */
export interface RiddleAttempt {
  /** 1-based riddle number from a leading "N:" prefix, or null when the reply is a bare answer. */
  number: number | null;
  /** The answer text with any leading riddle-number prefix stripped. */
  answer: string;
}

/**
 * Split a riddle reply into an optional leading riddle number and the answer, per the
 * "<number>: <answer>" format guests are asked to use (e.g. "2: cache"). The number may
 * be written as "2:", "2.", "2)", "2 -", "2 ", "#2", or "riddle 2:"; a reply that does
 * not start with a number comes back with `number: null` (a bare answer). The number is
 * what lets the validator bind an answer to one specific riddle, so a correct answer
 * filed under the wrong number is rejected instead of silently credited.
 */
export function parseRiddleAttempt(rawText: string): RiddleAttempt {
  const match = /^\s*(?:riddle\s+)?#?\s*(\d{1,3})[\s:.)\-]+(.+)$/iu.exec(rawText);
  if (!match) return { number: null, answer: rawText.trim() };
  return { number: Number(match[1]), answer: match[2].trim() };
}

/**
 * Resolve which of a guest's assigned riddles a reply solves, or null.
 *
 * Guests file each answer under its riddle number ("2: cache"). When a number is present
 * the answer is *bound* to that one riddle and only counts if it matches it, so a correct
 * answer filed under the wrong number is rejected rather than credited to whichever riddle
 * it happens to fit. A reply with no number falls back to matching any still-unsolved
 * riddle whose answer appears, in any order. `riddles` is the guest's full ordered
 * assignment (the number is a 1-based index into it); `solved` ids are never matched again.
 */
export function matchRiddleAnswer(
  riddles: readonly Clue[],
  rawText: string,
  solved: ReadonlySet<string> = new Set<string>(),
): Clue | null {
  const { number, answer } = parseRiddleAttempt(rawText);
  if (number !== null) {
    const target = riddles[number - 1];
    if (!target || solved.has(target.id)) return null;
    return clueAccepts(target, answer) ? target : null;
  }
  return riddles.find((r) => !solved.has(r.id) && clueAccepts(r, answer)) ?? null;
}

/** True if `answerText` carries one of the clue's accepted answers as a whole token. */
function clueAccepts(clue: Clue, answerText: string): boolean {
  const normalized = normalize(answerText);
  return clue.answers.some((a) => containsRiddleAnswer(normalized, a));
}

function containsRiddleAnswer(normalizedText: string, answer: string): boolean {
  const tokens = normalizedText.split(/\s+/u).filter(Boolean);
  const target = answer.toLowerCase().replace(/[^a-z0-9]+/gu, "");
  return tokens.some((t) => t.replace(/[^a-z0-9]+/gu, "") === target);
}
