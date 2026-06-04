import { FLOWS } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import {
  MISSION_BY_ID,
  MISSION_SEQUENCE,
  RIDDLE_MISSION_ID,
  RIDDLE_POINTS_EACH,
  RIDDLE_QUEST_COUNT,
  type MissionTemplate,
} from "@/constants/missions";
import { newId } from "@/domain/ids";
import {
  extractGameIds,
  isValidColorCombo,
  matchRiddleAnswer,
  riddlesForParticipant,
} from "@/domain/mission-parse";
import { containsPhrase, normalize } from "@/domain/text";
import { now } from "@/lib/time";
import type { Conversation, MissionResult, Participant } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { ConversationService } from "@/server/services/conversations";
import type { ProjectionService } from "@/server/services/projection";

export type MissionOutcome =
  | { kind: "no_mission" }
  | { kind: "correct"; points: number; nextPrompt: string | null }
  | { kind: "incorrect"; hint: string | undefined }
  | { kind: "partner_invalid" }
  | { kind: "duplicate_partner" }
  | { kind: "riddle_progress"; solved: number; total: number; nextRiddlePrompt: string }
  | { kind: "already" };

export interface DeliveredMission {
  mission: MissionTemplate;
  prompt: string;
}

const COLOR_MISSION_ID = "color-constellation";
const WORD_MISSION_ID = "word-thread";

/**
 * Owns the three quests (color, word, riddle), deterministic validation, scoring,
 * and progress. Quests can be completed in any order: a submission is routed by
 * shape (real partner game ids -> color/word, a bare word -> a riddle), never by a
 * fixed sequence. The agent only delivers copy; pass/fail is decided here.
 */
export class MissionService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly conversations: ConversationService,
    private readonly projection: ProjectionService,
  ) {}

  current(conversation: Conversation): MissionTemplate | null {
    return conversation.currentMissionId
      ? (MISSION_BY_ID.get(conversation.currentMissionId) ?? null)
      : null;
  }

  /** How many of the three quests a guest has completed (for STATUS / progress). */
  async questProgress(participantId: string): Promise<{ done: number; total: number }> {
    const completed = new Set(await this.repos.participantMissions.completedMissionIds(participantId));
    const done = MISSION_SEQUENCE.filter((id) => completed.has(id)).length;
    return { done, total: MISSION_SEQUENCE.length };
  }

  renderPrompt(template: MissionTemplate, participant: Participant): string {
    if (template.type === "riddle_quest") return this.renderRiddlePrompt(participant);
    return template.promptCopy
      .replaceAll("{gem}", GEMS[participant.gem].label)
      .replaceAll("{word}", participant.secretWord)
      .replaceAll("{game_id}", participant.gameId);
  }

  private renderRiddlePrompt(participant: Participant): string {
    const riddles = riddlesForParticipant(participant.gameId);
    const lines = riddles.map((r, i) => `${i + 1}. ${r.prompt}`).join("\n\n");
    return `Three riddles. Solve each and text me the one-word answer (any order).\n\n${lines}`;
  }

  /** The next quest to surface (any incomplete one), assigning it if needed. */
  async deliverCurrent(
    participant: Participant,
    conversation: Conversation,
  ): Promise<DeliveredMission | null> {
    const completed = new Set(await this.repos.participantMissions.completedMissionIds(participant.id));
    const active = this.current(conversation);
    if (active && !completed.has(active.id)) {
      return { mission: active, prompt: this.renderPrompt(active, participant) };
    }
    const next = await this.advance(participant, conversation);
    return next ? { mission: next, prompt: this.renderPrompt(next, participant) } : null;
  }

  async submit(
    participant: Participant,
    conversation: Conversation,
    rawText: string,
  ): Promise<MissionOutcome> {
    const completed = new Set(await this.repos.participantMissions.completedMissionIds(participant.id));
    if (MISSION_SEQUENCE.every((id) => completed.has(id))) return { kind: "no_mission" };

    // Route by shape: a message naming real, checked-in OTHER guests is a partner
    // quest (color or word); anything else is read as a riddle answer.
    const gameIds = extractGameIds(rawText);
    const partners = (await this.resolvePartners(gameIds)).filter((p) => p.id !== participant.id);

    if (partners.length > 0) {
      return this.submitPartner(participant, conversation, rawText, partners, completed);
    }
    if (!completed.has(RIDDLE_MISSION_ID)) {
      return this.submitRiddle(participant, conversation, rawText);
    }
    return { kind: "incorrect", hint: this.remainingPartnerHint(completed) };
  }

  /** Color or word quest. Each partner counts once across quests (meet new people). */
  private async submitPartner(
    participant: Participant,
    conversation: Conversation,
    rawText: string,
    partners: Participant[],
    completed: Set<string>,
  ): Promise<MissionOutcome> {
    const used = await this.usedPartnerGameIds(participant.id);
    const fresh = partners.filter((p) => !used.has(p.gameId.toUpperCase()));
    if (fresh.length === 0) return { kind: "duplicate_partner" };

    const color = MISSION_BY_ID.get(COLOR_MISSION_ID);
    const word = MISSION_BY_ID.get(WORD_MISSION_ID);

    if (color && !completed.has(COLOR_MISSION_ID)) {
      const gems = [participant.gem, ...fresh.map((p) => p.gem)];
      if (isValidColorCombo(gems)) {
        return this.complete(participant, conversation, color, rawText, fresh.map((p) => p.gameId));
      }
    }

    if (word && !completed.has(WORD_MISSION_ID)) {
      const haystack = normalize(rawText);
      const match = fresh.find((p) => containsPhrase(haystack, normalize(p.secretWord)));
      if (match) {
        return this.complete(participant, conversation, word, rawText, [match.gameId]);
      }
    }

    // A partner was named but nothing validated: hint toward the likely quest.
    if (color && !completed.has(COLOR_MISSION_ID)) return { kind: "incorrect", hint: color.hint };
    if (word && !completed.has(WORD_MISSION_ID)) return { kind: "incorrect", hint: word.hint };
    return { kind: "incorrect", hint: undefined };
  }

  /** Riddle quest: solve the guest's three riddles in any order, 50 points each. */
  private async submitRiddle(
    participant: Participant,
    conversation: Conversation,
    rawText: string,
  ): Promise<MissionOutcome> {
    const riddle = MISSION_BY_ID.get(RIDDLE_MISSION_ID);
    if (!riddle) return { kind: "no_mission" };

    const riddles = riddlesForParticipant(participant.gameId);
    const solvedBefore = new Set(await this.repos.riddleSolves.solvedIds(participant.id));
    const unsolved = riddles.filter((r) => !solvedBefore.has(r.id));
    const match = matchRiddleAnswer(unsolved, normalize(rawText));

    if (!match) {
      await this.recordEvent(participant, RIDDLE_MISSION_ID, rawText, [], "incorrect", 0);
      return { kind: "incorrect", hint: riddle.hint };
    }

    const firstSolve = await this.repos.riddleSolves.markSolved(this.eventId, participant.id, match.id);
    await this.repos.participantMissions.assign(this.eventId, participant.id, RIDDLE_MISSION_ID);
    await this.repos.participantMissions.markSubmitted(participant.id, RIDDLE_MISSION_ID);
    await this.recordEvent(
      participant,
      RIDDLE_MISSION_ID,
      rawText,
      [],
      "correct",
      firstSolve ? RIDDLE_POINTS_EACH : 0,
    );

    if (firstSolve) {
      const score = await this.repos.participants.addScore(participant.id, RIDDLE_POINTS_EACH);
      await this.projection.emit("score.updated", { gameId: participant.gameId, score });
    }

    const solvedCount = solvedBefore.size + (firstSolve ? 1 : 0);
    if (solvedCount >= RIDDLE_QUEST_COUNT) {
      const transitioned = await this.repos.participantMissions.markCompleted(
        participant.id,
        RIDDLE_MISSION_ID,
        riddle.points,
      );
      if (transitioned) {
        await this.projection.emit("mission.completed", {
          gameId: participant.gameId,
          missionId: RIDDLE_MISSION_ID,
          title: riddle.title,
          effect: riddle.projectionEffect,
        });
      }
      const next = await this.advance(participant, conversation);
      return {
        kind: "correct",
        points: RIDDLE_POINTS_EACH,
        nextPrompt: next ? this.renderPrompt(next, participant) : null,
      };
    }

    const nextRiddle = riddles.find((r) => r.id !== match.id && !solvedBefore.has(r.id));
    const idx = nextRiddle ? riddles.findIndex((r) => r.id === nextRiddle.id) : -1;
    return {
      kind: "riddle_progress",
      solved: solvedCount,
      total: RIDDLE_QUEST_COUNT,
      nextRiddlePrompt: nextRiddle ? `${idx + 1}. ${nextRiddle.prompt}` : "",
    };
  }

  /** Mark a partner quest correct, score it, fan out projection, and queue the next quest. */
  private async complete(
    participant: Participant,
    conversation: Conversation,
    mission: MissionTemplate,
    rawText: string,
    partnerGameIds: string[],
  ): Promise<MissionOutcome> {
    await this.repos.participantMissions.assign(this.eventId, participant.id, mission.id);
    await this.repos.participantMissions.markSubmitted(participant.id, mission.id);
    await this.recordEvent(participant, mission.id, rawText, partnerGameIds, "correct", mission.points);

    const transitioned = await this.repos.participantMissions.markCompleted(
      participant.id,
      mission.id,
      mission.points,
    );
    if (!transitioned) return { kind: "already" };

    const newScore = await this.repos.participants.addScore(participant.id, mission.points);
    await this.projection.emit("mission.completed", {
      gameId: participant.gameId,
      missionId: mission.id,
      title: mission.title,
      effect: mission.projectionEffect,
    });
    await this.projection.emit("score.updated", { gameId: participant.gameId, score: newScore });

    const next = await this.advance(participant, conversation);
    return {
      kind: "correct",
      points: mission.points,
      nextPrompt: next ? this.renderPrompt(next, participant) : null,
    };
  }

  private async recordEvent(
    participant: Participant,
    missionId: string,
    rawText: string,
    partnerGameIds: string[],
    result: MissionResult,
    points: number,
  ): Promise<void> {
    await this.repos.missionEvents.insert({
      id: newId("me"),
      eventId: this.eventId,
      participantId: participant.id,
      missionId,
      rawAnswer: rawText,
      normalizedAnswer: normalize(rawText),
      partnerGameIds,
      result,
      pointsAwarded: points,
      createdAt: now(),
    });
  }

  /** Game ids this guest has already paired with on a correct submission. */
  private async usedPartnerGameIds(participantId: string): Promise<Set<string>> {
    const events = await this.repos.missionEvents.listByParticipant(participantId);
    const used = new Set<string>();
    for (const e of events) {
      if (e.result === "correct") for (const g of e.partnerGameIds) used.add(g.toUpperCase());
    }
    return used;
  }

  private async resolvePartners(gameIds: string[]): Promise<Participant[]> {
    const found = await Promise.all(
      gameIds.map((gid) => this.repos.participants.findByGameId(this.eventId, gid)),
    );
    return found.filter((p): p is Participant => p !== null && !p.eliminated);
  }

  private remainingPartnerHint(completed: Set<string>): string {
    if (!completed.has(COLOR_MISSION_ID)) {
      return "for the color quest, text everyone's game IDs, yours included.";
    }
    if (!completed.has(WORD_MISSION_ID)) {
      return "for the word quest, text a new partner's game ID and their secret word.";
    }
    return "you've cleared the labyrinth.";
  }

  /** Surface the next incomplete quest (any order); idle when all three are done. */
  async advance(participant: Participant, conversation: Conversation): Promise<MissionTemplate | null> {
    const completed = new Set(await this.repos.participantMissions.completedMissionIds(participant.id));
    const nextId = MISSION_SEQUENCE.find((id) => !completed.has(id)) ?? null;
    if (!nextId) {
      await this.conversations.setFlow(conversation.id, FLOWS.IDLE, null);
      return null;
    }
    await this.repos.participantMissions.assign(this.eventId, participant.id, nextId);
    await this.conversations.setFlow(conversation.id, FLOWS.MISSION, nextId);
    return MISSION_BY_ID.get(nextId) ?? null;
  }
}
