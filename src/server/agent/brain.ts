import { GEMS } from "@/constants/gems";
import { MISSION_BY_ID } from "@/constants/missions";
import { stripDashes } from "@/domain/text";
import type { InboundChannel } from "@/constants/event";
import type { Conversation, InteractionEvent, Participant } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { AgentRunner } from "@/server/agent/runner";
import type { ConversationService } from "@/server/services/conversations";
import type { MissionService } from "@/server/services/missions";

export interface BrainReply {
  text: string;
  channel: InboundChannel;
  participantId: string | null;
  conversationId: string;
}

/**
 * Front door for an inbound interaction. Resolves the conversation, grounds the
 * LLM with the guest's current state, runs the conversational agent (which
 * routes + chats + calls deterministic tools), and returns the reply.
 */
export class AgentBrain {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly conversations: ConversationService,
    private readonly missions: MissionService,
    private readonly runner: AgentRunner,
  ) {}

  async process(event: InteractionEvent): Promise<BrainReply> {
    const conversation = await this.conversations.resolve(
      event.externalConversationId,
      event.from,
      event.channel,
    );
    const participant = await this.lookup(conversation, event.from);

    // Strip any em/en dash the model slips in: the brand voice never uses one.
    const text = stripDashes(
      await this.runner.run({
        from: event.from,
        externalConversationId: event.externalConversationId,
        channel: event.channel,
        text: event.text,
        recentHistory: event.recentHistory,
        grounding: this.grounding(participant, conversation),
      }),
    );

    // Re-read: the agent may have checked the guest in or advanced their mission.
    const after = event.from
      ? await this.repos.participants.findByPhone(this.eventId, event.from)
      : participant;
    const conversationNow = (await this.repos.conversations.findById(conversation.id)) ?? conversation;
    return {
      text,
      channel: event.channel,
      participantId: after?.id ?? null,
      conversationId: conversationNow.id,
    };
  }

  private async lookup(conversation: Conversation, phone: string): Promise<Participant | null> {
    if (conversation.participantId) {
      const byId = await this.repos.participants.findById(conversation.participantId);
      if (byId) return byId;
    }
    return phone ? this.repos.participants.findByPhone(this.eventId, phone) : null;
  }

  private grounding(participant: Participant | null, conversation: Conversation): string {
    if (!participant) {
      return "CURRENT GUEST: not checked in yet. Ask their name, then call check_in with it. Do not check them in without a name.";
    }
    const nameLine = participant.displayName
      ? ` Name: ${participant.displayName}.`
      : " Name unknown: ask once and call check_in with their answer to save it.";
    const mission = conversation.currentMissionId
      ? MISSION_BY_ID.get(conversation.currentMissionId)
      : null;
    const missionLine = mission
      ? ` Active mission: ${mission.title}. ${this.missions.renderPrompt(mission, participant)}`
      : " No active mission.";
    return `CURRENT GUEST:${nameLine} gem ${GEMS[participant.gem].label}, secret word "${participant.secretWord}", game id ${participant.gameId}, score ${participant.score}.${missionLine}`;
  }
}
