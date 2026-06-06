import { describe, expect, it } from "vitest";
import { firstNameKey, matchRosterByName } from "@/domain/door";

describe("door roster matching (by first name)", () => {
  it("reduces a full RSVP name to its first-name key", () => {
    expect(firstNameKey("Aashna Mehta")).toBe("aashna");
    expect(firstNameKey("  DEMO ")).toBe("demo");
    expect(firstNameKey(null)).toBe("");
  });

  it("lights up the matching expected guest when someone checks in by first name", () => {
    const waitlist = ["Aashna Mehta", "Windsor Nguyen", "Cathy Di"];
    const arrivals = ["Cathy", "Aashna"];
    expect(matchRosterByName(waitlist, arrivals)).toEqual([1, -1, 0]);
  });

  it("matches one arrival to one row when first names collide", () => {
    const waitlist = ["Aaron B", "Aaron Li", "Aaron Zhu"];
    const arrivals = ["Aaron"]; // only one Aaron showed up
    const matched = matchRosterByName(waitlist, arrivals);
    expect(matched.filter((i) => i >= 0)).toHaveLength(1);
    expect(matched[0]).toBe(0); // the first Aaron row claims the lone arrival
  });

  it("ignores arrivals that match no expected guest", () => {
    expect(matchRosterByName(["Dana"], ["Stranger"])).toEqual([-1]);
  });
});
