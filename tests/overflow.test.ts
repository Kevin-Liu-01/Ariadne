import { describe, expect, it } from "vitest";
import { capForDisplay } from "@/domain/overflow";

describe("capForDisplay", () => {
  const people = ["a", "b", "c", "d", "e"];

  it("shows everyone and hides nothing when under the limit", () => {
    expect(capForDisplay(people, 10)).toEqual({ visible: people, overflow: 0 });
  });

  it("shows everyone when exactly at the limit", () => {
    expect(capForDisplay(people, 5)).toEqual({ visible: people, overflow: 0 });
  });

  it("caps to the limit and reports the rest as overflow", () => {
    expect(capForDisplay(people, 3)).toEqual({ visible: ["a", "b", "c"], overflow: 2 });
  });

  it("never shows a pointless '+1 more': one extra item is cheaper to render than an overflow chip", () => {
    // limit 4 would hide exactly one of five; show all five instead of "4 + (+1 more)".
    expect(capForDisplay(people, 4)).toEqual({ visible: people, overflow: 0 });
  });

  it("treats a non-positive limit as no cap", () => {
    expect(capForDisplay(people, 0)).toEqual({ visible: people, overflow: 0 });
    expect(capForDisplay(people, -3)).toEqual({ visible: people, overflow: 0 });
  });

  it("returns a fresh array, never the caller's reference", () => {
    const out = capForDisplay(people, 10);
    expect(out.visible).not.toBe(people);
    expect(out.visible).toEqual(people);
  });

  it("handles an empty list", () => {
    expect(capForDisplay([], 5)).toEqual({ visible: [], overflow: 0 });
  });
});
