import { FLOWS, type InboundChannel } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { FIRST_MISSION_ID, MISSION_BY_ID, type MissionTemplate } from "@/constants/missions";
import { assignGem, assignSecretWord } from "@/domain/assignment";
import { newGameId, newId } from "@/domain/ids";
import { cleanDisplayName, isProfane } from "@/domain/profanity";
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
  email?: string | null;
  category?: string | null;
}

export interface RegisterResult {
  participant: Participant;
  conversation: Conversation;
  isNew: boolean;
  firstMission: MissionTemplate | null;
}

export interface CheckInByEmailInput {
  email: string;
  name?: string | null;
  phone?: string | null;
  stationId?: string | null;
  channel?: InboundChannel | null;
  category?: string | null;
}

export interface CheckInByEmailResult {
  participant: Participant;
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

  async register(input: RegisterInput): Promise<RegisterResult> {
    const conversation = await this.conversations.resolve(
      input.externalConversationId,
      input.phone,
      input.channel,
    );

    const existing = await this.findExisting(conversation.participantId, input.phone);
    if (existing) {
      if (!conversation.participantId) {
        await this.conversations.linkParticipant(conversation.id, existing.id);
      }
      return {
        participant: existing,
        conversation,
        isNew: false,
        firstMission: MISSION_BY_ID.get(FIRST_MISSION_ID) ?? null,
      };
    }

    // Assign + insert atomically. The assignment index comes from an event-scoped
    // counter bumped inside this transaction, so concurrent check-ins serialize on
    // it and each guest gets a distinct, even gem/word — no race, no skew.
    const participant = await this.repos.transaction(async (r) => {
      const p = await this.buildParticipant(r, input);
      await r.participants.insert(p);
      await r.conversations.setParticipant(conversation.id, p.id);
      await r.conversations.setFlow(conversation.id, FLOWS.IDLE, null);
      return p;
    });

    // Emit after commit so a rolled-back write never fans out a phantom tile.
    await this.projection.emit("participant.checked_in", {
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
        currentFlow: FLOWS.IDLE,
        currentMissionId: null,
      },
      isNew: true,
      firstMission: MISSION_BY_ID.get(FIRST_MISSION_ID) ?? null,
    };
  }

  /**
   * Check in from the web (no phone thread to key off). The waitlist email is the
   * identity: an existing guest (including one already checked in by text) resumes
   * the same participant rather than minting a duplicate board tile. A phone is
   * backfilled when a previously phone-less web guest later links their texts.
   */
  async checkInByEmail(input: CheckInByEmailInput): Promise<CheckInByEmailResult> {
    const email = input.email.trim().toLowerCase();
    const firstMission = MISSION_BY_ID.get(FIRST_MISSION_ID) ?? null;

    const existing = await this.repos.participants.findByEmail(this.eventId, email);
    if (existing) {
      const participant =
        input.phone && !existing.phone
          ? ((await this.repos.participants.applyEdits(existing.id, { phone: input.phone })) ?? existing)
          : existing;
      return { participant, isNew: false, firstMission };
    }

    const result = await this.register({
      phone: input.phone ?? null,
      externalConversationId: null,
      channel: input.channel ?? null,
      name: input.name ?? null,
      email,
      category: input.category ?? null,
      stationId: input.stationId ?? null,
    });
    return { participant: result.participant, isNew: result.isNew, firstMission: result.firstMission };
  }

  private async findExisting(
    participantId: string | null,
    phone: string | null,
  ): Promise<Participant | null> {
    if (participantId) {
      const byId = await this.repos.participants.findById(participantId);
      if (byId) return byId;
    }
    if (phone) return this.repos.participants.findByPhone(this.eventId, phone);
    return null;
  }

  private async buildParticipant(repos: Repositories, input: RegisterInput): Promise<Participant> {
    // One atomic counter bump per check-in -> a distinct, even round-robin index.
    const index = (await repos.counters.next(this.eventId, "assign")) - 1;
    const gem = assignGem(input.category ?? null, index);
    const secretWord = assignSecretWord(index);
    const gameId = await this.uniqueGameId(repos);
    const ts = now();
    return {
      id: newId("par"),
      eventId: this.eventId,
      gameId,
      displayName: cleanDisplayName(input.name),
      phone: input.phone,
      email: input.email ? input.email.trim().toLowerCase() : null,
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

  private async uniqueGameId(repos: Repositories): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const id = newGameId();
      // Skip codes that read as profanity — they go on the public board.
      if (isProfane(id)) continue;
      if (!(await repos.participants.gameIdExists(this.eventId, id))) return id;
    }
    return newGameId(5);
  }
}
