import { describe, expect, it } from "vitest";
import { assignGem, assignSecretWord } from "@/domain/assignment";

describe("assignGem", () => {
  it("maps a known RSVP category directly, ignoring the index", () => {
    expect(assignGem("Engineering", 0)).toBe("garnet");
    expect(assignGem("founder", 3)).toBe("amethyst");
  });

  it("round-robins the palette by index when category is unknown", () => {
    expect(assignGem(null, 0)).toBe("amethyst");
    expect(assignGem(null, 1)).toBe("garnet");
    expect(assignGem(null, 6)).toBe("amethyst"); // wraps around the six gems
  });
});

describe("assignSecretWord", () => {
  it("hands out half-phrase words by index, completing pairs first", () => {
    expect(assignSecretWord(0)).toBe("give");
    expect(assignSecretWord(1)).toBe("wings");
    expect(assignSecretWord(2)).toBe("drip");
  });
});
