import type { InboundChannel } from "@/constants/event";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { getAgentphoneClient, outboundEnabled } from "@/server/partners/agentphone/client";

/**
 * Outbound guest messaging. Best-effort by design: if AgentPhone outbound is
 * constrained (e.g. unregistered 10DLC) we log and return false — the operator
 * queue and projection board keep the room running regardless (per the PRD).
 */
export async function sendGuestText(
  toNumber: string,
  text: string,
  opts?: { mediaUrls?: string[] },
): Promise<boolean> {
  if (!outboundEnabled()) return false;
  try {
    await getAgentphoneClient().sendMessage({
      agentId: env.agentphone.agentId,
      toNumber,
      body: text,
      ...(opts?.mediaUrls?.length ? { mediaUrls: opts.mediaUrls } : {}),
    });
    return true;
  } catch (err) {
    console.error("[ariadne] outbound send failed", err);
    return false;
  }
}

export async function sendToParticipant(participantId: string, text: string): Promise<boolean> {
  const participant = await getBackbone().repos.participants.findById(participantId);
  if (!participant?.phone) return false;
  return sendGuestText(participant.phone, text);
}

/**
 * Show the iMessage typing bubble while the brain composes a reply, so the guest sees
 * Ariadne "composing" instead of dead air during a multi-second tool loop. iMessage-only
 * and best-effort by design: the provider silently drops the indicator off iMessage, on
 * group chats, or stale threads (see the AgentPhone Conversations guide), so we gate on
 * channel + conversation id and never let a failure touch the guest reply path.
 */
export async function sendTypingIndicator(
  channel: InboundChannel,
  externalConversationId: string | null,
): Promise<void> {
  if (channel !== "imessage" || !externalConversationId) return;
  if (!outboundEnabled()) return;
  try {
    await getAgentphoneClient().sendTyping(externalConversationId);
  } catch {
    // the typing bubble is cosmetic; never let it affect the guest reply path
  }
}

/** Mirror lightweight context onto the AgentPhone conversation. Fire-and-forget. */
export async function mirrorConversation(
  externalConversationId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!outboundEnabled()) return;
  try {
    await getAgentphoneClient().updateConversationMetadata(externalConversationId, metadata);
  } catch {
    // mirroring is cosmetic; never let it affect the guest reply path
  }
}
