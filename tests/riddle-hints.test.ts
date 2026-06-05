import { describe, expect, it } from "vitest";
import { CLUES } from "@/constants/clues";
import { isRiddleRevealed, riddleNudge } from "@/domain/riddle-hints";

describe("riddle hint ladder (pure)", () => {
  it("gives every riddle at least two progressive hints before the reveal", () => {
    for (const clue of CLUES) {
      expect(clue.hints.length).toBeGreaterThanOrEqual(2);
      // Hints must never just hand over an accepted answer verbatim.
      const answers = new Set(clue.answers.map((a) => a.toLowerCase()));
      for (const hint of clue.hints) {
        expect(answers.has(hint.trim().toLowerCase())).toBe(false);
      }
    }
  });

  it("escalates one hint per miss, then reveals the answer once hints run out", () => {
    const clue = CLUES[0];

    const first = riddleNudge(clue, 1);
    expect(first).toEqual({ kind: "hint", level: 1, text: clue.hints[0] });

    const second = riddleNudge(clue, 2);
    expect(second).toEqual({ kind: "hint", level: 2, text: clue.hints[1] });

    const third = riddleNudge(clue, 3);
    expect(third).toEqual({ kind: "reveal", answer: clue.answers[0] });

    // The reveal is sticky: further misses keep showing the answer.
    expect(riddleNudge(clue, 4)).toEqual({ kind: "reveal", answer: clue.answers[0] });
  });

  it("flags the reveal threshold exactly at hints.length + 1", () => {
    const clue = CLUES[0];
    expect(isRiddleRevealed(clue, clue.hints.length)).toBe(false);
    expect(isRiddleRevealed(clue, clue.hints.length + 1)).toBe(true);
  });
});
