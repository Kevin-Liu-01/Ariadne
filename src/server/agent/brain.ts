import { helpCopy } from "@/constants/copy";
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
    // Stamp activity so the reminder sweep leaves mid-conversation guests alone.
    await this.repos.conversations.touch(conversation.id);
    const participant = await this.lookup(conversation, event.from);

    if (/^\s*help\s*$/i.test(event.text.trim())) {
      return {
        text: stripDashes(helpCopy()),
        channel: event.channel,
        participantId: participant?.id ?? null,
        conversationId: conversation.id,
      };
    }

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
      return "CURRENT GUEST: not checked in yet. Open warmly: 'Welcome to Dedalus Run(way)time. Let's thread you in.' Ask for the email they signed up with, then call check_in with that email. If check_in returns not_on_list, gently tell them that email is not on tonight's list and you cannot thread them in. If it returns needs_name, ask their first name. Never check anyone in without a waitlisted email.";
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
