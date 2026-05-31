import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/domain/phone";

describe("normalizePhone", () => {
  it("maps the same US number to one canonical form however it arrives", () => {
    const canonical = "+17328105793";
    expect(normalizePhone("+17328105793")).toBe(canonical);
    expect(normalizePhone("7328105793")).toBe(canonical);
    expect(normalizePhone("(732) 810-5793")).toBe(canonical);
    expect(normalizePhone("1 732 810 5793")).toBe(canonical);
    expect(normalizePhone(" +1 (732) 810-5793 ")).toBe(canonical);
  });

  it("keeps an explicit non-US country code", () => {
    expect(normalizePhone("+44 7911 123456")).toBe("+447911123456");
  });

  it("passes an iMessage email handle through, lowercased", () => {
    expect(normalizePhone("Guest@Example.com")).toBe("guest@example.com");
  });

  it("returns empty for blank input", () => {
    expect(normalizePhone("   ")).toBe("");
  });
});
