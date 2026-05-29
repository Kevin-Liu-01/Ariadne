import { describe, expect, it } from "vitest";
import { FLOWS } from "@/constants/event";
import { classifyIntent, extractName, type IntentContext } from "@/domain/intent";

const asParticipant: IntentContext = {
  isParticipant: true,
  currentFlow: FLOWS.MISSION,
  hasActiveMission: true,
};

describe("classifyIntent", () => {
  it("routes non-participants to check-in", () => {
    const r = classifyIntent("vodka soda", {
      isParticipant: false,
      currentFlow: FLOWS.CHECKIN,
      hasActiveMission: false,
    });
    expect(r.type).toBe("checkin");
  });

  it("confident drink wins even mid-mission", () => {
    expect(classifyIntent("espresso martini", asParticipant).type).toBe("drink_order");
  });

  it("treats free text as a mission answer when a mission is active", () => {
    expect(classifyIntent("AB12 CD34 EF56", asParticipant).type).toBe("mission_answer");
  });

  it("detects help and status", () => {
    expect(classifyIntent("help", asParticipant).type).toBe("help");
    expect(
      classifyIntent("what's my mission", { ...asParticipant, hasActiveMission: false }).type,
    ).toBe("status");
  });

  it("falls back to unknown for idle gibberish", () => {
    expect(
      classifyIntent("zxqw", { isParticipant: true, currentFlow: FLOWS.IDLE, hasActiveMission: false })
        .type,
    ).toBe("unknown");
  });
});

describe("extractName", () => {
  it("pulls explicit names", () => {
    expect(extractName("my name is Alice")).toBe("Alice");
    expect(extractName("I'm Bob Lee")).toBe("Bob Lee");
  });

  it("ignores drink-like and command-like text", () => {
    expect(extractName("vodka soda")).toBeNull();
    expect(extractName("help")).toBeNull();
  });
});
