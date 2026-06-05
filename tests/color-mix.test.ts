import { describe, expect, it } from "vitest";
import { clamp01, mixHex } from "@/domain/color-mix";

describe("clamp01", () => {
  it("passes through the unit interval and clamps outside it", () => {
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});

describe("mixHex", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("lands on the per-channel midpoint at t=0.5", () => {
    // 0x00 -> 0xff midpoint is 128 (0x80) after rounding.
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("mixes each channel independently", () => {
    expect(mixHex("#ff0000", "#0000ff", 0.5)).toBe("#800080");
  });

  it("clamps t so out-of-range amounts cannot overshoot the endpoints", () => {
    expect(mixHex("#102030", "#a0b0c0", -5)).toBe("#102030");
    expect(mixHex("#102030", "#a0b0c0", 5)).toBe("#a0b0c0");
  });

  it("accepts 3-digit shorthand hex", () => {
    expect(mixHex("#000", "#fff", 0)).toBe("#000000");
    expect(mixHex("#f00", "#00f", 0.5)).toBe("#800080");
  });
});
