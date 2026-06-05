import { after } from "next/server";
import { env } from "@/lib/env";
import { newId } from "@/domain/ids";
import { now } from "@/lib/time";
import { getBackbone } from "@/server/backbone";
import type { Backbone } from "@/server/backbone";
import { processInboundText } from "@/server/partners/agentphone/inbound";
import { normalizeAgentphone } from "@/server/partners/agentphone/normalize";
import type { AgentphoneWebhookBody } from "@/server/partners/agentphone/types";
import { verifyAgentphoneSignature } from "@/server/partners/agentphone/verify";
import { allowInbound } from "@/server/http/rate-limit";
import type { InteractionEvent } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// We acknowledge within milliseconds and finish the reply in an `after()` task; this
// cap covers that background work (a cold start plus a multi-step gateway turn).
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

  // Claim the delivery (idempotent). A duplicate of an in-flight or completed turn is
  // dropped; only a prior failed attempt is re-claimed so a retry can recover it.
  const claim = await bb.repos.partnerEvents.claim({
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
  if (claim === "duplicate") return new Response("ok (duplicate)", { status: 200 });

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

  // Voice is answered on the open call: stream an interim line, then the spoken reply.
  if (interaction.channel === "voice") {
    return voiceStream(bb, interaction, webhookId);
  }

  // Text: acknowledge now, generate + send the reply after responding. The LLM turn
  // therefore can't exceed AgentPhone's 30s webhook timeout (it would otherwise be
  // retried or dropped); the reply goes out over their outbound API regardless.
  after(() => processInboundText(bb, interaction, webhookId));
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
