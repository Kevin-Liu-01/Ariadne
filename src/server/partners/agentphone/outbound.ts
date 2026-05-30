import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { getAgentphoneClient, outboundEnabled } from "@/server/partners/agentphone/client";

/**
 * Outbound guest messaging. Best-effort by design: if AgentPhone outbound is
 * constrained (e.g. unregistered 10DLC) we log and return false — the operator
 * queue and projection board keep the room running regardless (per the PRD).
 */
export async function sendGuestText(toNumber: string, text: string): Promise<boolean> {
  if (!outboundEnabled()) return false;
  try {
    await getAgentphoneClient().sendMessage({
      agentId: env.agentphone.agentId,
      toNumber,
      body: text,
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
