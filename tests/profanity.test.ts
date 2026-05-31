import { describe, expect, it } from "vitest";
import { cleanDisplayName, isProfane } from "@/domain/profanity";

describe("profanity gate", () => {
  it("passes clean names through, trimmed", () => {
    expect(cleanDisplayName("  Kevin ")).toBe("Kevin");
    expect(cleanDisplayName("DJ Moonbeam")).toBe("DJ Moonbeam");
  });

  it("caps overly long names to 40 chars", () => {
    expect(cleanDisplayName("x".repeat(60))?.length).toBe(40);
  });

  it("blocks profane names, including light obfuscation, by returning null", () => {
    expect(cleanDisplayName("shit")).toBeNull();
    expect(cleanDisplayName("sh1t")).toBeNull();
    expect(isProfane("a perfectly clean phrase")).toBe(false);
  });

  it("treats empty or missing input as no name", () => {
    expect(cleanDisplayName("   ")).toBeNull();
    expect(cleanDisplayName(null)).toBeNull();
    expect(cleanDisplayName(undefined)).toBeNull();
  });
});
