import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, normalizePhone } from "@/domain/phone";

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

describe("formatPhoneDisplay", () => {
  it("renders a US E.164 number as (+1) AAA-PPP-LLLL", () => {
    expect(formatPhoneDisplay("+18159970034")).toBe("(+1) 815-997-0034");
  });

  it("treats a bare 10-digit US number the same way", () => {
    expect(formatPhoneDisplay("8159970034")).toBe("(+1) 815-997-0034");
  });

  it("leaves a non-US number unchanged rather than mislabel it +1", () => {
    expect(formatPhoneDisplay("+447911123456")).toBe("+447911123456");
  });

  it("passes blank and email handles through untouched", () => {
    expect(formatPhoneDisplay("")).toBe("");
    expect(formatPhoneDisplay("guest@example.com")).toBe("guest@example.com");
  });
});
