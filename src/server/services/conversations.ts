import { FLOWS, type Flow, type InboundChannel } from "@/constants/event";
import { newId } from "@/domain/ids";
import { now } from "@/lib/time";
import type { Conversation } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";

/** Resolves and mutates the conversation row that backs a phone/voice thread. */
export class ConversationService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
  ) {}

  /**
   * Find or create the conversation for an inbound thread. Prefers the partner
   * conversation id, falls back to phone, and backfills the external id when a
   * phone-only row later learns it.
   */
  async resolve(
    externalId: string | null,
    phone: string | null,
    channel: InboundChannel | null,
  ): Promise<Conversation> {
    if (externalId) {
      const byExternal = await this.repos.conversations.findByExternalId(externalId);
      if (byExternal) return byExternal;
    }
    if (phone) {
      const byPhone = await this.repos.conversations.findByPhone(this.eventId, phone);
      if (byPhone) {
        if (externalId && !byPhone.externalId) {
          await this.repos.conversations.setExternalId(byPhone.id, externalId);
          return (await this.repos.conversations.findById(byPhone.id)) ?? byPhone;
        }
        return byPhone;
      }
    }
    const conversation: Conversation = {
      id: newId("cnv"),
      eventId: this.eventId,
      participantId: null,
      externalId,
      phone,
      channel,
      currentFlow: FLOWS.CHECKIN,
      currentMissionId: null,
      contactCardSent: false,
      welcomeImageSent: false,
      textsPaused: false,
      hostRequestState: null,
      pendingIntent: null,
      createdAt: now(),
      updatedAt: now(),
    };
    await this.repos.conversations.insert(conversation);
    return conversation;
  }

  async linkParticipant(conversationId: string, participantId: string): Promise<void> {
    await this.repos.conversations.setParticipant(conversationId, participantId);
  }

  async setFlow(conversationId: string, flow: Flow, missionId: string | null): Promise<void> {
    await this.repos.conversations.setFlow(conversationId, flow, missionId);
  }
}
