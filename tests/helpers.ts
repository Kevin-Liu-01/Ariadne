import type { InboundChannel } from "@/constants/event";
import type { InteractionEvent } from "@/domain/types";
import { Backbone } from "@/server/backbone";
import { createPgliteDb } from "@/server/db/pglite";
import type { ChatFn } from "@/server/partners/dedalus/types";

/** A backbone over a fresh in-memory pglite DB (real Postgres semantics, no network). */
export async function freshBackbone(chat?: ChatFn): Promise<Backbone> {
  return new Backbone(await createPgliteDb(), { eventId: "test-event", chat });
}

let counter = 0;

export function inbound(
  from: string,
  text: string,
  extra: Partial<InteractionEvent> = {},
): InteractionEvent {
  counter += 1;
  return {
    provider: "agentphone",
    webhookId: `wh_${counter}`,
    channel: (extra.channel as InboundChannel) ?? "sms",
    externalConversationId: extra.externalConversationId ?? `conv_${from}`,
    from,
    to: "+19990000000",
    text,
    mediaUrls: extra.mediaUrls ?? [],
    receivedAt: new Date().toISOString(),
    recentHistory: extra.recentHistory ?? [],
    conversationState: extra.conversationState ?? null,
  };
}
