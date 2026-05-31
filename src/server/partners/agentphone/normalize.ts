import type { InboundChannel } from "@/constants/event";
import { normalizePhone } from "@/domain/phone";
import { now } from "@/lib/time";
import type { InteractionEvent } from "@/domain/types";
import type { AgentphoneWebhookBody } from "@/server/partners/agentphone/types";

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Normalize an `agent.message` (SMS/MMS/iMessage text or a voice transcript) into
 * the internal {@link InteractionEvent}. Returns null for events we don't act on
 * here (call_ended, reactions) — those are logged but don't mutate game state.
 */
export function normalizeAgentphone(
  body: AgentphoneWebhookBody,
  webhookId: string,
): InteractionEvent | null {
  if (body.event !== "agent.message") return null;

  const data = body.data ?? {};
  const channel = body.channel as InboundChannel;
  const isVoice = channel === "voice";
  const text = isVoice ? str(data.transcript) : str(data.message);

  const mediaUrls: string[] = [];
  if (typeof data.mediaUrl === "string") mediaUrls.push(data.mediaUrl);
  if (Array.isArray(data.mediaUrls)) {
    for (const m of data.mediaUrls) if (typeof m === "string") mediaUrls.push(m);
  }

  return {
    provider: "agentphone",
    webhookId,
    channel,
    externalConversationId: str(data.conversationId) || str(data.callId) || null,
    from: normalizePhone(str(data.from)),
    to: str(data.to) || null,
    text,
    mediaUrls,
    receivedAt: str(data.receivedAt) || body.timestamp || now(),
    recentHistory: (body.recentHistory ?? []).map((h) => ({
      content: h.content,
      direction: h.direction,
    })),
    conversationState: body.conversationState ?? null,
  };
}
