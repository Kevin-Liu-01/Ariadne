import {
  alreadyHereCopy,
  drinkClarifyCopy,
  drinkQueuedCopy,
  drinkUnavailableCopy,
  helpCopy,
  missionCorrectCopy,
  missionDeliverCopy,
  missionPartnerInvalidCopy,
  missionWrongCopy,
  notCheckedInCopy,
  unknownCopy,
  welcomeCopy,
} from "@/constants/copy";
import type { InboundChannel } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { classifyIntent, type Intent, type IntentContext } from "@/domain/intent";
import { assertNever } from "@/lib/assert";
import type { Conversation, InteractionEvent, Participant } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { ConversationService } from "@/server/services/conversations";
import type { DrinkService } from "@/server/services/drinks";
import type { MissionService } from "@/server/services/missions";
import type { RegistrationService } from "@/server/services/registration";

export interface BrainReply {
  text: string;
  channel: InboundChannel;
  participantId: string | null;
  conversationId: string;
  intent: Intent["type"];
}

/**
 * The default deterministic brain. Classifies one inbound interaction, drives
 * the backbone services, and returns cinematic reply copy. State decisions are
 * deterministic; an LLM (hosted mode or a strap-on agent) is never in this path.
 */
export class AgentBrain {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly registration: RegistrationService,
    private readonly drinks: DrinkService,
    private readonly missions: MissionService,
    private readonly conversations: ConversationService,
  ) {}

  process(event: InteractionEvent): BrainReply {
    const conversation = this.conversations.resolve(
      event.externalConversationId,
      event.from,
      event.channel,
    );
    const participant = this.lookupParticipant(conversation, event.from);

    const ctx: IntentContext = {
      isParticipant: participant !== null,
      currentFlow: conversation.currentFlow,
      hasActiveMission: conversation.currentMissionId !== null,
    };
    const intent = classifyIntent(event.text, ctx);

    const handled = this.handle(intent, event, conversation, participant);
    return {
      text: handled.text,
      channel: event.channel,
      participantId: handled.participantId,
      conversationId: conversation.id,
      intent: intent.type,
    };
  }

  private handle(
    intent: Intent,
    event: InteractionEvent,
    conversation: Conversation,
    participant: Participant | null,
  ): { text: string; participantId: string | null } {
    switch (intent.type) {
      case "checkin":
        return this.handleCheckin(intent.name, event);
      case "drink_order":
        return participant
          ? { text: this.handleDrink(participant, conversation, intent.rawText), participantId: participant.id }
          : { text: notCheckedInCopy(), participantId: null };
      case "mission_answer":
        return participant
          ? { text: this.handleMission(participant, conversation, intent.rawText), participantId: participant.id }
          : { text: notCheckedInCopy(), participantId: null };
      case "status":
        return participant
          ? { text: this.handleStatus(participant, conversation), participantId: participant.id }
          : { text: notCheckedInCopy(), participantId: null };
      case "help":
        return { text: helpCopy(), participantId: participant?.id ?? null };
      case "unknown":
        return {
          text: participant ? unknownCopy() : notCheckedInCopy(),
          participantId: participant?.id ?? null,
        };
      default:
        return assertNever(intent);
    }
  }

  private handleCheckin(
    name: string | null,
    event: InteractionEvent,
  ): { text: string; participantId: string } {
    const stationId =
      typeof event.conversationState?.station_id === "string"
        ? event.conversationState.station_id
        : null;
    const result = this.registration.register({
      phone: event.from,
      externalConversationId: event.externalConversationId,
      channel: event.channel,
      name,
      stationId,
    });
    const p = result.participant;
    if (!result.isNew) {
      return {
        text: alreadyHereCopy({ gemLabel: GEMS[p.gem].label, gameId: p.gameId }),
        participantId: p.id,
      };
    }
    const missionPrompt = result.firstMission
      ? this.missions.renderPrompt(result.firstMission, p)
      : "watch the board.";
    return {
      text: welcomeCopy({
        gemLabel: GEMS[p.gem].label,
        word: p.secretWord,
        gameId: p.gameId,
        missionPrompt,
      }),
      participantId: p.id,
    };
  }

  private handleDrink(participant: Participant, conversation: Conversation, rawText: string): string {
    const outcome = this.drinks.createFromText(participant, conversation.id, rawText);
    switch (outcome.kind) {
      case "queued":
        return drinkQueuedCopy(outcome.order.label);
      case "unavailable":
        return drinkUnavailableCopy(outcome.label);
      case "clarify":
        return drinkClarifyCopy();
      default:
        return assertNever(outcome);
    }
  }

  private handleMission(participant: Participant, conversation: Conversation, rawText: string): string {
    const outcome = this.missions.submit(participant, conversation, rawText);
    switch (outcome.kind) {
      case "correct":
        return missionCorrectCopy({ points: outcome.points, nextMissionPrompt: outcome.nextPrompt ?? undefined });
      case "incorrect":
        return missionWrongCopy(outcome.hint);
      case "partner_invalid":
        return missionPartnerInvalidCopy();
      case "already":
        return "already solved that one — stay close to the screen.";
      case "no_mission": {
        const delivered = this.missions.deliverCurrent(participant, conversation);
        return delivered
          ? missionDeliverCopy({ title: delivered.mission.title, prompt: delivered.prompt })
          : "no active move right now. order a drink or watch the board.";
      }
      default:
        return assertNever(outcome);
    }
  }

  private handleStatus(participant: Participant, conversation: Conversation): string {
    const delivered = this.missions.deliverCurrent(participant, conversation);
    return delivered
      ? missionDeliverCopy({ title: delivered.mission.title, prompt: delivered.prompt })
      : "you've cleared the labyrinth. stay close to the screen.";
  }

  private lookupParticipant(conversation: Conversation, phone: string): Participant | null {
    if (conversation.participantId) {
      const byId = this.repos.participants.findById(conversation.participantId);
      if (byId) return byId;
    }
    return phone ? this.repos.participants.findByPhone(this.eventId, phone) : null;
  }
}
