import { drinkMenuCopy, helpCopy, songPromptCopy } from "@/constants/copy";
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

    // Bare keyword commands resolve deterministically, no model call. HELP works
    // for anyone; DRINK and SONG prompts assume a checked-in guest (otherwise the
    // model runs and routes them through check-in first).
    const makeReply = (text: string): BrainReply => ({
      text: stripDashes(text),
      channel: event.channel,
      participantId: participant?.id ?? null,
      conversationId: conversation.id,
    });
    const command = event.text.trim();
    if (/^help$/i.test(command)) return makeReply(helpCopy());
    if (participant) {
      if (/^drink$/i.test(command)) return makeReply(drinkMenuCopy());
      if (/^song$/i.test(command)) return makeReply(songPromptCopy());
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
      return "CURRENT GUEST: not checked in yet. Check-in is two steps: first ask their first name, then the email they signed up with. Call check_in as you collect each (pass the name, then the name and email together). If check_in returns needs_name ask their first name; needs_email ask for the signup email; not_on_list tell them that email is not on tonight's list and you cannot check them in. Never check anyone in without a waitlisted email.";
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
