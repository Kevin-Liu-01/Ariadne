import { describe, expect, it } from "vitest";
import { DRINK_MENU } from "@/constants/drinks";
import { isMultiDrinkOrder, parseDrink } from "@/domain/drink-parse";

describe("parseDrink", () => {
  it("maps a clear order with high confidence", () => {
    const r = parseDrink("can I get a machina mule");
    expect(r.item?.id).toBe("machina_mule");
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  // The contract: a guest can order any item by typing the name shown on the menu
  // (the displayed label) or any listed alias. This is the invariant the
  // "Margar(AI)ta" bug violated -- its label normalizes to "margar ai ta", which
  // no alias covered.
  it("matches every menu item by its displayed label", () => {
    for (const item of DRINK_MENU) {
      expect(parseDrink(item.label).item?.id, `label "${item.label}"`).toBe(item.id);
    }
  });

  it("matches every menu item by each of its aliases", () => {
    for (const item of DRINK_MENU) {
      for (const alias of item.aliases) {
        expect(parseDrink(alias).item?.id, `alias "${alias}" of ${item.id}`).toBe(item.id);
      }
    }
  });

  it("matches the stylized Margar(AI)ta the way it appears on the menu", () => {
    expect(parseDrink("can I get a Margar(AI)ta").item?.id).toBe("margaraita");
    expect(parseDrink("margarita please").item?.id).toBe("margaraita");
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

describe("isMultiDrinkOrder", () => {
  it("flags a count plus a drink noun", () => {
    expect(isMultiDrinkOrder("can I get two beers")).toBe(true);
    expect(isMultiDrinkOrder("three margs")).toBe(true);
  });

  it("flags two distinct items named at once", () => {
    expect(isMultiDrinkOrder("a modelo and a stella")).toBe(true);
    expect(isMultiDrinkOrder("modelo, margarita")).toBe(true);
  });

  it("treats a single multi-word drink as one order, not many", () => {
    // "water" is a substring of these, but the named item is one drink.
    expect(isMultiDrinkOrder("sparkling water")).toBe(false);
    expect(isMultiDrinkOrder("soda water")).toBe(false);
    expect(isMultiDrinkOrder("bubbly water")).toBe(false);
    expect(isMultiDrinkOrder("a red bull")).toBe(false);
    expect(isMultiDrinkOrder("Margar(AI)ta")).toBe(false);
  });

  it("does not flag a single drink with a modifier", () => {
    expect(isMultiDrinkOrder("machina mule on the rocks")).toBe(false);
    expect(isMultiDrinkOrder("a double machina mule")).toBe(false);
  });
});
