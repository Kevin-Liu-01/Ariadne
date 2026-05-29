import { describe, expect, it } from "vitest";
import { assignGem, assignSecretWord } from "@/domain/assignment";

describe("assignGem", () => {
  it("maps a known RSVP category directly", () => {
    expect(assignGem("Engineering", {})).toBe("garnet");
    expect(assignGem("founder", {})).toBe("amethyst");
  });

  it("balances the room when category is unknown", () => {
    expect(assignGem(null, {})).toBe("amethyst"); // least-used, first in order
    expect(assignGem(null, { amethyst: 2, garnet: 1 })).toBe("moonstone"); // skip the used ones
  });
});

describe("assignSecretWord", () => {
  it("hands out the least-used half-phrase word", () => {
    expect(assignSecretWord({})).toBe("give");
    expect(assignSecretWord({ give: 1 })).toBe("wings");
  });
});
