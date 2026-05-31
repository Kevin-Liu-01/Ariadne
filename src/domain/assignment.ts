import { GEM_IDS, RSVP_CATEGORY_TO_GEM, type GemId } from "@/constants/gems";
import { WORD_PAIRS } from "@/constants/missions";

// Pairs are laid out [a0, b0, a1, b1, ...]; round-robin by index hands them out
// a0, b0, a1, b1, ... so both halves of a phrase land and the word-match mission
// stays solvable. The index comes from an atomic per-event counter, so the
// distribution is even and race-free even under simultaneous check-ins.
const WORD_POOL: readonly string[] = WORD_PAIRS.flat();

/**
 * Assign a gem. A known RSVP category maps directly (we never tell the guest
 * why); otherwise round-robin the palette by the guest's assignment index.
 */
export function assignGem(category: string | null, index: number): GemId {
  if (category) {
    const mapped = RSVP_CATEGORY_TO_GEM[category.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return GEM_IDS[index % GEM_IDS.length];
}

/** Assign a half-phrase secret word by round-robin index, keeping pair halves balanced. */
export function assignSecretWord(index: number): string {
  return WORD_POOL[index % WORD_POOL.length];
}
