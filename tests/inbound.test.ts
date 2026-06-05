import { describe, expect, it } from "vitest";
import type { ChatFn, ChatResponse } from "@/server/partners/dedalus/types";
import type { PartnerEvent } from "@/domain/types";
import { processInboundText } from "@/server/partners/agentphone/inbound";
import { freshBackbone, inbound } from "./helpers";

const EVENT = "test-event";

function content(text: string): ChatResponse {
  return {
    id: "x",
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
  };
}

/** A received claim row matching how the route records a delivery before handing off. */
function claimRow(webhookId: string): PartnerEvent {
  return {
    id: `pe_${webhookId}`,
    eventId: EVENT,
    provider: "agentphone",
    webhookId,
    eventType: "agent.message",
    channel: "sms",
    payload: "{}",
    status: "received",
    createdAt: new Date().toISOString(),
  };
}

/**
 * processInboundText is the work the webhook schedules with `after()` once it has
 * already returned 200. These prove the reply is produced out-of-band and that a
 * failure is recorded (not thrown) so the request path is never affected.
 */
describe("inbound text processing (async reply path)", () => {
  it("generates the reply and marks the event processed", async () => {
    const bb = await freshBackbone(async () => content("welcome in."));
    const ev = inbound("+15551112222", "hey");
    await bb.repos.partnerEvents.claim(claimRow(ev.webhookId));

    await processInboundText(bb, ev, ev.webhookId);

    // The reply lands in the durable transcript (the outbound API send is a no-op in
    // tests, where AgentPhone outbound is disabled without credentials).
    const conv = await bb.repos.conversations.findByPhone(EVENT, "+15551112222");
    expect(conv).toBeTruthy();
    const msgs = await bb.repos.messages.recentByConversation(conv!.id, 10);
    expect(msgs.find((m) => m.direction === "outbound")?.content).toBe("welcome in.");

    // The event is committed processed, so a duplicate delivery is now dropped.
    expect(await bb.repos.partnerEvents.claim(claimRow(ev.webhookId))).toBe("duplicate");
  });

  it("records an error and never throws when the brain fails", async () => {
    const bb = await freshBackbone(async () => {
      throw new Error("gateway down");
    });
    const ev = inbound("+15553334444", "hello");
    await bb.repos.partnerEvents.claim(claimRow(ev.webhookId));

    await expect(processInboundText(bb, ev, ev.webhookId)).resolves.toBeUndefined();

    // A failed turn is left re-claimable so an AgentPhone retry can recover it.
    expect(await bb.repos.partnerEvents.claim(claimRow(ev.webhookId))).toBe("claimed");
  });
});
