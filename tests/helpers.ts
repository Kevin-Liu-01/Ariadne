import type { InboundChannel } from "@/constants/event";
import type { InteractionEvent } from "@/domain/types";
import { Backbone } from "@/server/backbone";
import { createDb } from "@/server/db/connection";
import { EventBus } from "@/server/services/event-bus";
import type { ChatFn } from "@/server/partners/dedalus/types";

export function freshBackbone(chat?: ChatFn): Backbone {
  return new Backbone(createDb(":memory:"), { eventId: "test-event", bus: new EventBus(), chat });
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
