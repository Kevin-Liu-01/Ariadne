import { describe, expect, it } from "vitest";
import { parseDrink } from "@/domain/drink-parse";

describe("parseDrink", () => {
  it("maps a clear order with high confidence", () => {
    const r = parseDrink("can I get a machina mule");
    expect(r.item?.id).toBe("machina_mule");
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("prefers the most specific (longest) alias", () => {
    expect(parseDrink("cloud hypervisor fizz please").item?.id).toBe("cloud_hypervisor_fizz");
  });

  it("extracts modifiers and dedupes nested ones", () => {
    const r = parseDrink("machina mule, double, on the rocks");
    expect(r.item?.id).toBe("machina_mule");
    expect(r.modifiers).toContain("on the rocks");
    expect(r.modifiers).not.toContain("rocks");
    expect(r.modifiers).toContain("double");
  });

  it("returns no item for non-drink text", () => {
    expect(parseDrink("where is the bathroom").item).toBeNull();
  });

  it("does not treat a mission word phrase as the house drink", () => {
    expect(parseDrink("give wings").item).toBeNull();
  });
});
