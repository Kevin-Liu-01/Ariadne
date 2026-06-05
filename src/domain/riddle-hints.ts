import type { Clue } from "@/constants/clues";

/**
 * Escalating help for the riddle a guest is stuck on. A `hint` is a progressive
 * nudge; a `reveal` hands over the answer once the hint ladder is spent.
 */
export type RiddleNudge =
  | { readonly kind: "hint"; readonly level: number; readonly text: string }
  | { readonly kind: "reveal"; readonly answer: string };

/**
 * Pick the nudge for a guest's wrong attempt, keyed by how many times they have
 * missed this riddle (1-based). The first `hints.length` misses surface ever
 * sharper hints; after that we reveal the canonical answer. Deterministic and
 * pure: the service owns counting attempts and persisting the reveal.
 */
export function riddleNudge(clue: Clue, attempt: number): RiddleNudge {
  const index = attempt - 1;
  if (index >= 0 && index < clue.hints.length) {
    return { kind: "hint", level: index + 1, text: clue.hints[index] };
  }
  return { kind: "reveal", answer: clue.answers[0] };
}

/** True once every hint is spent and the next nudge reveals the answer. */
export function isRiddleRevealed(clue: Clue, attempt: number): boolean {
  return attempt > clue.hints.length;
}
