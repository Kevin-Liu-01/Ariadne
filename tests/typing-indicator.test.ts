import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatResponse } from "@/server/partners/dedalus/types";
import type { PartnerEvent } from "@/domain/types";
import { AgentphoneClient } from "@/server/partners/agentphone/client";
import { processInboundText } from "@/server/partners/agentphone/inbound";
import * as outbound from "@/server/partners/agentphone/outbound";
import { sendTypingIndicator } from "@/server/partners/agentphone/outbound";
import { freshBackbone, inbound } from "./helpers";

const EVENT = "test-event";

/** Credentials + flag so `outboundEnabled()` is true and the typing POST is attempted. */
function enableOutbound(): void {
  vi.stubEnv("ARIADNE_DISABLE_OUTBOUND", "");
  vi.stubEnv("AGENTPHONE_API_KEY", "test-key");
  vi.stubEnv("AGENTPHONE_AGENT_ID", "agt_test");
}

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
    channel: "imessage",
    payload: "{}",
    status: "received",
    createdAt: new Date().toISOString(),
  };
}

/**
 * The AgentPhone typing bubble (POST /v1/conversations/{id}/typing) is an iMessage-only,
 * best-effort signal you fire right before composing a reply. These pin the gates — it
 * only goes out on iMessage, needs a conversation id, respects the outbound kill switch,
 * and can never throw into the reply path — and that the inbound turn actually fires it.
 */
describe("typing indicator (iMessage-only, best-effort)", () => {
  beforeEach(() => {
    // Drop the cached client so it rebuilds under the stubbed creds (prototype spies still apply).
    delete (globalThis as { __ariadneAgentphone?: unknown }).__ariadneAgentphone;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends the bubble on an iMessage turn", async () => {
    enableOutbound();
    const spy = vi.spyOn(AgentphoneClient.prototype, "sendTyping").mockResolvedValue({});
    await sendTypingIndicator("imessage", "conv_abc");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("conv_abc");
  });

  it("skips SMS, MMS, and voice — the provider only renders the bubble on iMessage", async () => {
    enableOutbound();
    const spy = vi.spyOn(AgentphoneClient.prototype, "sendTyping").mockResolvedValue({});
    await sendTypingIndicator("sms", "conv_abc");
    await sendTypingIndicator("mms", "conv_abc");
    await sendTypingIndicator("voice", "conv_abc");
    expect(spy).not.toHaveBeenCalled();
  });

  it("skips when there is no AgentPhone conversation id to target", async () => {
    enableOutbound();
    const spy = vi.spyOn(AgentphoneClient.prototype, "sendTyping").mockResolvedValue({});
    await sendTypingIndicator("imessage", null);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does nothing when outbound is disabled (no credentials)", async () => {
    vi.stubEnv("AGENTPHONE_API_KEY", "");
    const spy = vi.spyOn(AgentphoneClient.prototype, "sendTyping").mockResolvedValue({});
    await sendTypingIndicator("imessage", "conv_abc");
    expect(spy).not.toHaveBeenCalled();
  });

  it("swallows a provider failure so the guest reply path is never affected", async () => {
    enableOutbound();
    vi.spyOn(AgentphoneClient.prototype, "sendTyping").mockRejectedValue(new Error("boom"));
    await expect(sendTypingIndicator("imessage", "conv_abc")).resolves.toBeUndefined();
  });

  it("the inbound reply path fires the bubble with the turn's channel + conversation", async () => {
    // Outbound stays disabled (as in the other inbound tests) so the reply path runs on
    // the per-test pglite backbone; we assert the wiring contract at the helper seam.
    const fire = vi.spyOn(outbound, "sendTypingIndicator").mockResolvedValue();

    const bb = await freshBackbone(async () => content("welcome in."));
    const ev = inbound("+15551112222", "hey", {
      channel: "imessage",
      externalConversationId: "conv_im",
    });
    await bb.repos.partnerEvents.claim(claimRow(ev.webhookId));

    await processInboundText(bb, ev, ev.webhookId);

    expect(fire).toHaveBeenCalledWith("imessage", "conv_im");
  });
});
