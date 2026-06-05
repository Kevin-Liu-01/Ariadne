import { describe, expect, it } from "vitest";
import { COCKTAIL_STOCK_PER_ITEM, menuSummary } from "@/constants/drinks";
import type { Backbone } from "@/server/backbone";
import type { Participant } from "@/domain/types";
import { freshBackbone } from "./helpers";

async function checkIn(bb: Backbone, phone: string): Promise<{ p: Participant; convId: string }> {
  const r = await bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name: "Guest",
  });
  return { p: r.participant, convId: r.conversation.id };
}

/**
 * Seed `n` non-cancelled orders of one menu item straight into the bar queue, each
 * under a distinct synthetic guest, so a single cocktail's stock can be driven to
 * its cap without standing up `n` real registrations.
 */
async function seedOrders(bb: Backbone, menuItemId: string, n: number): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    await bb.repos.drinkOrders.insert({
      id: `seed_${menuItemId}_${i}`,
      eventId: bb.eventId,
      participantId: `seed_p_${menuItemId}_${i}`,
      conversationId: null,
      rawText: menuItemId,
      menuItemId,
      label: menuItemId,
      modifiers: [],
      status: "queued",
      operatorNotes: null,
      createdAt: new Date().toISOString(),
      readyAt: null,
      pickedUpAt: null,
    });
  }
}

/** The bar's rejection contract: one cocktail voucher, unlimited everything else, no multi-orders. */
describe("DrinkService rejections", () => {
  it("queues a first cocktail, then rejects a second on the voucher", async () => {
    const bb = await freshBackbone();
    const { p, convId } = await checkIn(bb, "+1000000001");

    expect((await bb.drinks.createFromText(p, convId, "machina mule")).kind).toBe("queued");
    expect((await bb.drinks.createFromText(p, convId, "cloud hypervisor fizz")).kind).toBe("voucher_used");
  });

  it("pours beer, wine, and zero-proof without limit", async () => {
    const bb = await freshBackbone();
    const { p, convId } = await checkIn(bb, "+1000000002");

    expect((await bb.drinks.createFromText(p, convId, "modelo")).kind).toBe("queued");
    expect((await bb.drinks.createFromText(p, convId, "stella")).kind).toBe("queued");
    expect((await bb.drinks.createFromText(p, convId, "red wine")).kind).toBe("queued");
    expect((await bb.drinks.createFromText(p, convId, "still water")).kind).toBe("queued");
  });

  it("queues a margarita ordered by its stylized menu name", async () => {
    const bb = await freshBackbone();
    const { p, convId } = await checkIn(bb, "+1000000007");
    const outcome = await bb.drinks.createFromText(p, convId, "can I get a Margar(AI)ta");
    expect(outcome.kind).toBe("queued");
    if (outcome.kind === "queued") expect(outcome.order.menuItemId).toBe("margaraita");
  });

  it("queues sparkling water (its name contains 'water' but it is one drink)", async () => {
    const bb = await freshBackbone();
    const { p, convId } = await checkIn(bb, "+1000000008");
    const outcome = await bb.drinks.createFromText(p, convId, "sparkling water please");
    expect(outcome.kind).toBe("queued");
    if (outcome.kind === "queued") expect(outcome.order.menuItemId).toBe("sparkling_water");
  });

  it("rejects a multi-drink message", async () => {
    const bb = await freshBackbone();
    const { p, convId } = await checkIn(bb, "+1000000003");
    expect((await bb.drinks.createFromText(p, convId, "can I get two beers")).kind).toBe("invalid_quantity");
    expect((await bb.drinks.createFromText(p, convId, "a modelo and a stella")).kind).toBe("invalid_quantity");
  });

  it("asks for clarification on something not on the menu", async () => {
    const bb = await freshBackbone();
    const { p, convId } = await checkIn(bb, "+1000000004");
    expect((await bb.drinks.createFromText(p, convId, "can I get a cosmopolitan")).kind).toBe("clarify");
  });

  it("caps each cocktail at its own stock and names the one that ran out", async () => {
    const bb = await freshBackbone();
    await seedOrders(bb, "margaraita", COCKTAIL_STOCK_PER_ITEM);
    const { p, convId } = await checkIn(bb, "+1000000010");

    const out = await bb.drinks.createFromText(p, convId, "margarita");
    expect(out.kind).toBe("out_of_stock");
    if (out.kind === "out_of_stock") expect(out.label).toBe("Margar(AI)ta");
  });

  it("keeps a different cocktail (and unlimited drinks) flowing after one sells out", async () => {
    const bb = await freshBackbone();
    await seedOrders(bb, "margaraita", COCKTAIL_STOCK_PER_ITEM);
    const { p, convId } = await checkIn(bb, "+1000000011");

    // Per-item, not a global pool: another signature cocktail still pours.
    expect((await bb.drinks.createFromText(p, convId, "machina mule")).kind).toBe("queued");
    // Unlimited categories are untouched by cocktail stock.
    expect((await bb.drinks.createFromText(p, convId, "modelo")).kind).toBe("queued");
  });

  it("one short of the cap still pours that cocktail", async () => {
    const bb = await freshBackbone();
    await seedOrders(bb, "margaraita", COCKTAIL_STOCK_PER_ITEM - 1);
    const { p, convId } = await checkIn(bb, "+1000000012");
    expect((await bb.drinks.createFromText(p, convId, "margarita")).kind).toBe("queued");
  });
});

describe("bar menu copy", () => {
  it("frames the unlimited drinks as lasting until supplies run out", () => {
    expect(menuSummary()).toContain("until supplies run out");
  });
});
