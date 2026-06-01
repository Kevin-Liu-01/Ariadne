import { describe, expect, it } from "vitest";
import {
  alreadyHereCopy,
  drinkClarifyCopy,
  drinkInProgressCopy,
  drinkQueuedCopy,
  drinkReadyCopy,
  drinkUnavailableCopy,
  helpCopy,
  missionCorrectCopy,
  missionDeliverCopy,
  missionNeedsInputCopy,
  missionPartnerInvalidCopy,
  missionWrongCopy,
  notCheckedInCopy,
  unknownCopy,
  welcomeCopy,
} from "@/constants/copy";
import { CLUES } from "@/constants/clues";
import { ARIADNE_LORE } from "@/constants/lore";
import { MISSIONS } from "@/constants/missions";
import { ARIADNE_BEGIN_MESSAGE, ARIADNE_SYSTEM_PROMPT } from "@/constants/prompts";
import { stripDashes } from "@/domain/text";

const DASH = /[—–]/;

const allCopy = [
  welcomeCopy({ gemLabel: "Garnet", word: "thread", gameId: "G7F3", missionPrompt: "find a match." }),
  alreadyHereCopy({ gemLabel: "Garnet", gameId: "G7F3" }),
  missionDeliverCopy({ title: "The Thread", prompt: "find your match." }),
  missionCorrectCopy({ points: 100, nextMissionPrompt: "next move." }),
  missionCorrectCopy({ points: 120 }),
  missionWrongCopy("one word."),
  missionWrongCopy(),
  missionPartnerInvalidCopy(),
  missionNeedsInputCopy(),
  drinkQueuedCopy("Vodka Soda"),
  drinkClarifyCopy(),
  drinkReadyCopy("Vodka Soda"),
  drinkInProgressCopy("Vodka Soda"),
  drinkUnavailableCopy("Negroni"),
  helpCopy(),
  notCheckedInCopy(),
  unknownCopy(),
].join("\n\n");

describe("the agent's voice never uses an em/en dash", () => {
  it("system prompt + begin message are dash-free", () => {
    expect(ARIADNE_SYSTEM_PROMPT).not.toMatch(DASH);
    expect(ARIADNE_BEGIN_MESSAGE).not.toMatch(DASH);
  });

  it("lore facts are dash-free", () => {
    expect(ARIADNE_LORE).not.toMatch(DASH);
  });

  it("all reply copy is dash-free", () => {
    expect(allCopy).not.toMatch(DASH);
  });

  it("mission prompts/hints + clue prompts are dash-free", () => {
    const text = [
      ...MISSIONS.flatMap((m) => [m.promptCopy, m.hint ?? ""]),
      ...CLUES.map((c) => c.prompt),
    ].join("\n");
    expect(text).not.toMatch(DASH);
  });

  it("stripDashes rewrites a dash the model might still emit", () => {
    expect(stripDashes("Solved — +100 points.")).toBe("Solved, +100 points.");
    expect(stripDashes("Read it again – one word.")).toBe("Read it again, one word.");
    expect(stripDashes("plain text, no dash")).toBe("plain text, no dash");
    expect(stripDashes("a check-in hyphen stays")).toBe("a check-in hyphen stays");
  });
});
