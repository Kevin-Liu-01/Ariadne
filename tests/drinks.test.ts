import { describe, expect, it } from "vitest";
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

  it("rejects a multi-drink message", async () => {
    const bb = await freshBackbone();
    const { p, convId } = await checkIn(bb, "+1000000003");
    expect((await bb.drinks.createFromText(p, convId, "can I get two beers")).kind).toBe("invalid_quantity");
  });

  it("asks for clarification on something not on the menu", async () => {
    const bb = await freshBackbone();
    const { p, convId } = await checkIn(bb, "+1000000004");
    expect((await bb.drinks.createFromText(p, convId, "can I get a cosmopolitan")).kind).toBe("clarify");
  });
});
