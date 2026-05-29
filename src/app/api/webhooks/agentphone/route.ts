import { env } from "@/lib/env";
import { newId } from "@/domain/ids";
import { now } from "@/lib/time";
import type { BrainReply } from "@/server/agent/brain";
import { getBackbone } from "@/server/backbone";
import { mirrorConversation, sendGuestText } from "@/server/partners/agentphone/outbound";
import { normalizeAgentphone } from "@/server/partners/agentphone/normalize";
import type { AgentphoneWebhookBody } from "@/server/partners/agentphone/types";
import { verifyAgentphoneSignature } from "@/server/partners/agentphone/verify";
import type { InteractionEvent } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  const headers = {
    signature: req.headers.get("x-webhook-signature"),
    timestamp: req.headers.get("x-webhook-timestamp"),
    id: req.headers.get("x-webhook-id"),
    event: req.headers.get("x-webhook-event"),
  };

  if (!verifyAgentphoneSignature(raw, headers, env.agentphone.webhookSecret)) {
    return new Response("invalid signature", { status: 401 });
  }

  let body: AgentphoneWebhookBody;
  try {
    body = JSON.parse(raw) as AgentphoneWebhookBody;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const bb = getBackbone();
  const webhookId = headers.id ?? newId("wh");

  const fresh = bb.repos.partnerEvents.recordOnce({
    id: newId("pe"),
    eventId: bb.eventId,
    provider: "agentphone",
    webhookId,
    eventType: body.event,
    channel: body.channel ?? null,
    payload: raw,
    status: "received",
    createdAt: now(),
  });
  if (!fresh) return new Response("ok (duplicate)", { status: 200 });

  const interaction = normalizeAgentphone(body, webhookId);
  if (!interaction) {
    bb.repos.partnerEvents.markStatus(webhookId, "processed");
    return new Response("ok (ignored)", { status: 200 });
  }

  let reply: BrainReply;
  try {
    reply = bb.brain.process(interaction);
    bb.repos.partnerEvents.markStatus(webhookId, "processed");
  } catch (err) {
    bb.repos.partnerEvents.markStatus(webhookId, "error");
    console.error("[ariadne] brain error", err);
    if (interaction.channel === "voice") {
      return Response.json({ text: "one moment — I'm having trouble. text the number instead." });
    }
    return new Response("ok (error logged)", { status: 200 });
  }

  // Voice turns speak the reply inline; SMS/iMessage replies go out via the API.
  if (interaction.channel === "voice") {
    return Response.json({ text: reply.text });
  }

  await deliver(reply, interaction);
  return new Response("ok", { status: 200 });
}

async function deliver(reply: BrainReply, interaction: InteractionEvent): Promise<void> {
  await sendGuestText(interaction.from, reply.text);
  if (interaction.externalConversationId && reply.participantId) {
    const conversation = getBackbone().repos.conversations.findById(reply.conversationId);
    await mirrorConversation(interaction.externalConversationId, {
      participant_id: reply.participantId,
      event_id: getBackbone().eventId,
      current_flow: conversation?.currentFlow ?? null,
      current_mission_id: conversation?.currentMissionId ?? null,
    });
  }
}
