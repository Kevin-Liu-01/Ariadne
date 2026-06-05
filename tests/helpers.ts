import type { InboundChannel } from "@/constants/event";
import type { Conversation, InteractionEvent, Participant } from "@/domain/types";
import { Backbone } from "@/server/backbone";
import { createPgliteDb } from "@/server/db/pglite";
import type { ChatFn } from "@/server/partners/dedalus/types";

/** A backbone over a fresh in-memory pglite DB (real Postgres semantics, no network). */
export async function freshBackbone(chat?: ChatFn): Promise<Backbone> {
  return new Backbone(await createPgliteDb(), { eventId: "test-event", chat });
}

/** Register a guest and open gameplay (assign the first quest, flip to the game scene). */
export async function inGame(
  bb: Backbone,
  phone: string,
  name: string,
): Promise<{ participant: Participant; conversation: Conversation }> {
  const r = await bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name,
    email: `${name.toLowerCase()}@runwaytime.test`,
  });
  await bb.missions.unlockGameplay(r.participant, r.conversation);
  await bb.projection.emit("scene.changed", { scene: "game" });
  const conversation = (await bb.repos.conversations.findById(r.conversation.id)) ?? r.conversation;
  return { participant: r.participant, conversation };
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
