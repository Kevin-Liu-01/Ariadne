import { FLOWS, type InboundChannel } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { FIRST_MISSION_ID, MISSION_BY_ID, type MissionTemplate } from "@/constants/missions";
import { assignGem, assignSecretWord } from "@/domain/assignment";
import { newGameId, newId } from "@/domain/ids";
import { now } from "@/lib/time";
import type { Conversation, Participant } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { ConversationService } from "@/server/services/conversations";
import type { ProjectionService } from "@/server/services/projection";

export interface RegisterInput {
  phone: string | null;
  externalConversationId: string | null;
  channel: InboundChannel | null;
  stationId?: string | null;
  name?: string | null;
  category?: string | null;
}

export interface RegisterResult {
  participant: Participant;
  conversation: Conversation;
  isNew: boolean;
  firstMission: MissionTemplate | null;
}

/** Creates the canonical participant at check-in. Idempotent per phone/conversation. */
export class RegistrationService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly conversations: ConversationService,
    private readonly projection: ProjectionService,
  ) {}

  register(input: RegisterInput): RegisterResult {
    const conversation = this.conversations.resolve(
      input.externalConversationId,
      input.phone,
      input.channel,
    );

    const existing = this.findExisting(conversation.participantId, input.phone);
    if (existing) {
      if (!conversation.participantId) {
        this.conversations.linkParticipant(conversation.id, existing.id);
      }
      return {
        participant: existing,
        conversation,
        isNew: false,
        firstMission: MISSION_BY_ID.get(FIRST_MISSION_ID) ?? null,
      };
    }

    const participant = this.repos.transaction(() => {
      const created = this.buildParticipant(input);
      this.repos.participants.insert(created);
      this.repos.participantMissions.assign(this.eventId, created.id, FIRST_MISSION_ID);
      this.conversations.linkParticipant(conversation.id, created.id);
      this.conversations.setFlow(conversation.id, FLOWS.MISSION, FIRST_MISSION_ID);
      return created;
    });

    // Emit after commit so a rolled-back write never fans out a phantom tile.
    this.projection.emit("participant.checked_in", {
      gameId: participant.gameId,
      displayName: participant.displayName,
      gem: participant.gem,
      gemHex: GEMS[participant.gem].hex,
    });

    return {
      participant,
      conversation: {
        ...conversation,
        participantId: participant.id,
        currentFlow: FLOWS.MISSION,
        currentMissionId: FIRST_MISSION_ID,
      },
      isNew: true,
      firstMission: MISSION_BY_ID.get(FIRST_MISSION_ID) ?? null,
    };
  }

  private findExisting(participantId: string | null, phone: string | null): Participant | null {
    if (participantId) {
      const byId = this.repos.participants.findById(participantId);
      if (byId) return byId;
    }
    if (phone) return this.repos.participants.findByPhone(this.eventId, phone);
    return null;
  }

  private buildParticipant(input: RegisterInput): Participant {
    const gem = assignGem(input.category ?? null, this.repos.participants.gemCounts(this.eventId));
    const secretWord = assignSecretWord(this.repos.participants.secretWordCounts(this.eventId));
    const ts = now();
    return {
      id: newId("par"),
      eventId: this.eventId,
      gameId: this.uniqueGameId(),
      displayName: input.name ?? null,
      phone: input.phone,
      gem,
      secretWord,
      stationId: input.stationId ?? null,
      score: 0,
      eliminated: false,
      photoUrl: null,
      createdAt: ts,
      updatedAt: ts,
    };
  }

  private uniqueGameId(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const id = newGameId();
      if (!this.repos.participants.gameIdExists(this.eventId, id)) return id;
    }
    return newGameId(5);
  }
}
