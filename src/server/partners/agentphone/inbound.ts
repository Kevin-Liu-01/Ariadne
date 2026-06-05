import type { BrainReply } from "@/server/agent/brain";
import type { Backbone } from "@/server/backbone";
import { deliverGuestReply } from "@/server/partners/agentphone/contact-card";
import { mirrorConversation, sendTypingIndicator } from "@/server/partners/agentphone/outbound";
import type { InteractionEvent } from "@/domain/types";

/**
 * Generate the guest reply and deliver it through the AgentPhone outbound API.
 *
 * This runs AFTER the webhook has already returned 200 (scheduled via `after()`), so
 * a slow LLM turn — cold start plus a multi-step tool loop — can never trip
 * AgentPhone's 30s webhook timeout. Replies have always gone out over their API, not
 * the webhook response body, so decoupling them is the natural shape.
 *
 * It must never throw: the request has already been answered. A failure is recorded
 * (status `error`, which leaves the delivery re-claimable) and logged.
 */
export async function processInboundText(
  bb: Backbone,
  interaction: InteractionEvent,
  webhookId: string,
): Promise<void> {
  try {
    // Show the iMessage typing bubble while the (multi-second) brain turn runs. Fired
    // without await so it can never delay the reply; iMessage-only and best-effort.
    void sendTypingIndicator(interaction.channel, interaction.externalConversationId);
    const reply = await bb.brain.process(interaction);
    if (reply.participantId) {
      const guest = await bb.repos.participants.findById(reply.participantId);
      if (guest) void bb.projection.emit("participant.messaged", { gameId: guest.gameId });
    }
    await deliverReply(bb, reply, interaction);
    await bb.repos.partnerEvents.markStatus(webhookId, "processed");
  } catch (err) {
    await bb.repos.partnerEvents.markStatus(webhookId, "error");
    console.error("[ariadne] brain error", err);
  }
}

/** Send the reply, then mirror lightweight state back onto the AgentPhone conversation. */
async function deliverReply(
  bb: Backbone,
  reply: BrainReply,
  interaction: InteractionEvent,
): Promise<void> {
  await deliverGuestReply(interaction.from, reply.conversationId, reply.text, {
    forceContactCard: reply.attachContactCard ?? false,
  });
  if (interaction.externalConversationId && reply.participantId) {
    const conversation = await bb.repos.conversations.findById(reply.conversationId);
    await mirrorConversation(interaction.externalConversationId, {
      participant_id: reply.participantId,
      event_id: bb.eventId,
      current_flow: conversation?.currentFlow ?? null,
      current_mission_id: conversation?.currentMissionId ?? null,
    });
  }
}
