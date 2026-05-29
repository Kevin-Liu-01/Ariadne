import { describe, expect, it } from "vitest";
import { parseDrink } from "@/domain/drink-parse";

describe("parseDrink", () => {
  it("maps a clear order with high confidence", () => {
    const r = parseDrink("can I get a vodka soda");
    expect(r.item?.id).toBe("vodka_soda");
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("prefers the most specific (longest) alias", () => {
    expect(parseDrink("espresso martini please").item?.id).toBe("espresso_martini");
  });

  it("extracts modifiers and dedupes nested ones", () => {
    const r = parseDrink("whiskey sour, double, on the rocks");
    expect(r.item?.id).toBe("whiskey_sour");
    expect(r.modifiers).toContain("on the rocks");
    expect(r.modifiers).not.toContain("rocks");
    expect(r.modifiers).toContain("double");
  });

  it("returns no item for non-drink text", () => {
    expect(parseDrink("where is the bathroom").item).toBeNull();
  });

  it("does not treat the mission word 'wings' as the house drink", () => {
    expect(parseDrink("give wings").item).toBeNull();
  });
});
