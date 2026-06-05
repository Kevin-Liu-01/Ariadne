import { describe, expect, it } from "vitest";
import { CLUES } from "@/constants/clues";
import { matchRiddleAnswer, parseRiddleAttempt } from "@/domain/mission-parse";

// Three distinct, explicit riddles so the 1-based numbers are unambiguous:
//   1 = cache, 2 = daemon (aliases: daemon/demon), 3 = terminal.
const RIDDLES = [CLUES[0], CLUES[1], CLUES[2]];

describe("parseRiddleAttempt", () => {
  it("splits the '<number>: <answer>' format guests are asked to use", () => {
    expect(parseRiddleAttempt("2: cache")).toEqual({ number: 2, answer: "cache" });
    expect(parseRiddleAttempt("2:cache")).toEqual({ number: 2, answer: "cache" });
    expect(parseRiddleAttempt("2. cache")).toEqual({ number: 2, answer: "cache" });
    expect(parseRiddleAttempt("2) cache")).toEqual({ number: 2, answer: "cache" });
    expect(parseRiddleAttempt("2 - cache")).toEqual({ number: 2, answer: "cache" });
  });

  it("tolerates a leading '#' or the word 'riddle' and surrounding whitespace", () => {
    expect(parseRiddleAttempt("#2 cache")).toEqual({ number: 2, answer: "cache" });
    expect(parseRiddleAttempt("riddle 2: cache")).toEqual({ number: 2, answer: "cache" });
    expect(parseRiddleAttempt("  3:  Terminal ")).toEqual({ number: 3, answer: "Terminal" });
  });

  it("treats a bare answer with no leading number as number-less", () => {
    expect(parseRiddleAttempt("cache")).toEqual({ number: null, answer: "cache" });
    expect(parseRiddleAttempt("  CACHE ")).toEqual({ number: null, answer: "CACHE" });
    expect(parseRiddleAttempt("I think it's cache")).toEqual({ number: null, answer: "I think it's cache" });
  });
});

describe("matchRiddleAnswer number binding", () => {
  it("rejects a right answer filed under the wrong riddle number (the reported bug)", () => {
    // 'daemon' is the answer to riddle 2, but it is submitted as riddle 1.
    expect(matchRiddleAnswer(RIDDLES, "1: daemon")).toBeNull();
  });

  it("accepts the answer when the number matches the riddle", () => {
    expect(matchRiddleAnswer(RIDDLES, "2: daemon")?.id).toBe("daemon");
    expect(matchRiddleAnswer(RIDDLES, "1: cache")?.id).toBe("cache");
    expect(matchRiddleAnswer(RIDDLES, "3: terminal")?.id).toBe("terminal");
  });

  it("accepts an alias under the correct number", () => {
    expect(matchRiddleAnswer(RIDDLES, "2: demon")?.id).toBe("daemon");
  });

  it("rejects a number that is out of range for the guest's riddles", () => {
    expect(matchRiddleAnswer(RIDDLES, "4: cache")).toBeNull();
    expect(matchRiddleAnswer(RIDDLES, "0: cache")).toBeNull();
  });

  it("still matches a bare one-word answer in any order (no number required)", () => {
    expect(matchRiddleAnswer(RIDDLES, "daemon")?.id).toBe("daemon");
    expect(matchRiddleAnswer(RIDDLES, "cache")?.id).toBe("cache");
  });

  it("never re-credits a riddle that is already solved", () => {
    const solved = new Set(["daemon"]);
    expect(matchRiddleAnswer(RIDDLES, "2: daemon", solved)).toBeNull();
    expect(matchRiddleAnswer(RIDDLES, "daemon", solved)).toBeNull();
  });

  it("returns null when nothing in the message matches", () => {
    expect(matchRiddleAnswer(RIDDLES, "theseus")).toBeNull();
    expect(matchRiddleAnswer(RIDDLES, "2: theseus")).toBeNull();
  });
});
