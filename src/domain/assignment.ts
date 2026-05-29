import { GEM_IDS, RSVP_CATEGORY_TO_GEM, type GemId } from "@/constants/gems";
import { WORD_PAIRS } from "@/constants/missions";

const WORD_POOL: readonly string[] = WORD_PAIRS.flat();

/** Pick the least-used option so quests stay solvable; tie-break by declared order. */
function leastUsed<T extends string>(options: readonly T[], counts: Record<string, number>): T {
  let best = options[0];
  let bestCount = Number.POSITIVE_INFINITY;
  for (const opt of options) {
    const c = counts[opt] ?? 0;
    if (c < bestCount) {
      bestCount = c;
      best = opt;
    }
  }
  return best;
}

/**
 * Assign a gem. A known RSVP category maps directly (we never tell the guest
 * why); otherwise balance the room so color quests have matching partners.
 */
export function assignGem(category: string | null, gemCounts: Record<string, number>): GemId {
  if (category) {
    const mapped = RSVP_CATEGORY_TO_GEM[category.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return leastUsed(GEM_IDS, gemCounts);
}

/** Assign a half-phrase secret word, keeping pair halves balanced for word-match. */
export function assignSecretWord(wordCounts: Record<string, number>): string {
  return leastUsed(WORD_POOL, wordCounts);
}
