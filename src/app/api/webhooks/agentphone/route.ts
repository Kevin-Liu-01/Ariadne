import { env } from "@/lib/env";
import { newId } from "@/domain/ids";
import { now } from "@/lib/time";
import type { BrainReply } from "@/server/agent/brain";
import { getBackbone } from "@/server/backbone";
import type { Backbone } from "@/server/backbone";
import { mirrorConversation, sendGuestText } from "@/server/partners/agentphone/outbound";
import { normalizeAgentphone } from "@/server/partners/agentphone/normalize";
import type { AgentphoneWebhookBody } from "@/server/partners/agentphone/types";
import { verifyAgentphoneSignature } from "@/server/partners/agentphone/verify";
import { allowInbound } from "@/server/http/rate-limit";
import type { InteractionEvent } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The brain makes (possibly multi-step) gateway calls; give it room beyond the
// default function cap so a slow turn isn't killed mid-flight.
export const maxDuration = 60;

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

  const fresh = await bb.repos.partnerEvents.recordOnce({
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
    await bb.repos.partnerEvents.markStatus(webhookId, "processed");
    return new Response("ok (ignored)", { status: 200 });
  }

  // Per-guest rate cap: drop floods without spending a gateway call.
  if (!allowInbound(interaction.from)) {
    await bb.repos.partnerEvents.markStatus(webhookId, "processed");
    return new Response("ok (rate-limited)", { status: 200 });
  }

  // Voice is synchronous against a ~30s turn timeout — stream an interim chunk
  // immediately so the caller never hears silence while the brain thinks.
  if (interaction.channel === "voice") {
    return voiceStream(bb, interaction, webhookId);
  }

  let reply: BrainReply;
  try {
    reply = await bb.brain.process(interaction);
    await bb.repos.partnerEvents.markStatus(webhookId, "processed");
  } catch (err) {
    await bb.repos.partnerEvents.markStatus(webhookId, "error");
    console.error("[ariadne] brain error", err);
    return new Response("ok (error logged)", { status: 200 });
  }

  await deliver(reply, interaction);
  return new Response("ok", { status: 200 });
}

/** NDJSON voice response: interim "one sec" first, then the brain's spoken reply. */
function voiceStream(bb: Backbone, interaction: InteractionEvent, webhookId: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      write({ text: "one sec…", interim: true });
      try {
        const reply = await bb.brain.process(interaction);
        await bb.repos.partnerEvents.markStatus(webhookId, "processed");
        write({ text: reply.text });
      } catch (err) {
        await bb.repos.partnerEvents.markStatus(webhookId, "error");
        console.error("[ariadne] voice brain error", err);
        write({ text: "having trouble right now, text the number instead." });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson" } });
}

async function deliver(reply: BrainReply, interaction: InteractionEvent): Promise<void> {
  await sendGuestText(interaction.from, reply.text);
  if (interaction.externalConversationId && reply.participantId) {
    const conversation = await getBackbone().repos.conversations.findById(reply.conversationId);
    await mirrorConversation(interaction.externalConversationId, {
      participant_id: reply.participantId,
      event_id: getBackbone().eventId,
      current_flow: conversation?.currentFlow ?? null,
      current_mission_id: conversation?.currentMissionId ?? null,
    });
  }
}
