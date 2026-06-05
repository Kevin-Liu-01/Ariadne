import { describe, expect, it, vi } from "vitest";
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

  it("starts independent brain turns without waiting for earlier replies", async () => {
    const calls: string[] = [];
    let firstStarted!: () => void;
    let releaseFirst!: () => void;
    let secondStarted!: () => void;
    const firstCallStarted = new Promise<void>((resolve) => {
      firstStarted = resolve;
    });
    const firstCallBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondCallStarted = new Promise<void>((resolve) => {
      secondStarted = resolve;
    });

    const bb = await freshBackbone(async (req) => {
      const text = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
      calls.push(text);
      if (calls.length === 1) {
        firstStarted();
        await firstCallBlocked;
      } else if (calls.length === 2) {
        secondStarted();
      }
      return content(`reply to ${text}`);
    });
    const first = inbound("+15550000001", "first hello");
    const second = inbound("+15550000002", "second hello");
    await bb.repos.partnerEvents.claim(claimRow(first.webhookId));
    await bb.repos.partnerEvents.claim(claimRow(second.webhookId));

    const run = Promise.all([
      processInboundText(bb, first, first.webhookId),
      processInboundText(bb, second, second.webhookId),
    ]);

    await firstCallStarted;
    try {
      await vi.waitFor(() => expect(calls).toHaveLength(2), { timeout: 750, interval: 5 });
      await secondCallStarted;
      expect(calls).toEqual(["first hello", "second hello"]);
    } finally {
      releaseFirst();
    }
    await run;
    expect(await bb.repos.partnerEvents.claim(claimRow(first.webhookId))).toBe("duplicate");
    expect(await bb.repos.partnerEvents.claim(claimRow(second.webhookId))).toBe("duplicate");
  });
});
