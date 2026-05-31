import { FLOWS } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { assertNever } from "@/lib/assert";
import {
  MISSION_BY_ID,
  MISSION_SEQUENCE,
  type MissionTemplate,
  type ValidationRule,
} from "@/constants/missions";
import { puzzleById } from "@/constants/puzzles";
import { newId } from "@/domain/ids";
import {
  clueForParticipant,
  extractGameIds,
  isValidColorCombo,
  wordsPair,
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
  | { kind: "already" };

export interface DeliveredMission {
  mission: MissionTemplate;
  prompt: string;
}

/** Owns mission assignment, deterministic validation, scoring, and sequencing. */
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

  renderPrompt(template: MissionTemplate, participant: Participant): string {
    return template.promptCopy
      .replaceAll("{gem}", GEMS[participant.gem].label)
      .replaceAll("{word}", participant.secretWord)
      .replaceAll("{game_id}", participant.gameId)
      .replaceAll("{clue}", clueForParticipant(participant.gameId).prompt);
  }

  /** The current mission for a participant, assigning the next one if none is active. */
  async deliverCurrent(
    participant: Participant,
    conversation: Conversation,
  ): Promise<DeliveredMission | null> {
    const active = this.current(conversation);
    if (active) return { mission: active, prompt: this.renderPrompt(active, participant) };
    const next = await this.advance(participant, conversation);
    return next ? { mission: next, prompt: this.renderPrompt(next, participant) } : null;
  }

  async submit(
    participant: Participant,
    conversation: Conversation,
    rawText: string,
  ): Promise<MissionOutcome> {
    const mission = this.current(conversation);
    if (!mission) return { kind: "no_mission" };

    const partnerGameIds = extractGameIds(rawText);
    const result = await this.validate(mission.validation, participant, rawText, partnerGameIds);

    await this.repos.participantMissions.markSubmitted(participant.id, mission.id);
    await this.repos.missionEvents.insert({
      id: newId("me"),
      eventId: this.eventId,
      participantId: participant.id,
      missionId: mission.id,
      rawAnswer: rawText,
      normalizedAnswer: normalize(rawText),
      partnerGameIds,
      result,
      pointsAwarded: result === "correct" ? mission.points : 0,
      createdAt: now(),
    });

    if (result === "invalid") return { kind: "partner_invalid" };
    if (result === "incorrect") return { kind: "incorrect", hint: mission.hint };

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

  /** Deterministic pass/fail. The agent never decides this. */
  private async validate(
    rule: ValidationRule,
    participant: Participant,
    rawText: string,
    partnerGameIds: string[],
  ): Promise<MissionResult> {
    switch (rule.kind) {
      case "answer_key": {
        const haystack = normalize(rawText);
        const ok = rule.answers.some((a) => containsPhrase(haystack, normalize(a)));
        return ok ? "correct" : "incorrect";
      }
      case "color_combo": {
        const partners = await this.resolvePartners(partnerGameIds);
        const group = new Map<string, Participant>([[participant.id, participant]]);
        for (const p of partners) group.set(p.id, p);
        const gems = [...group.values()].map((p) => p.gem);
        return isValidColorCombo(gems) ? "correct" : "incorrect";
      }
      case "clue": {
        const clue = clueForParticipant(participant.gameId);
        const haystack = normalize(rawText);
        const ok = clue.answers.some((a) => containsPhrase(haystack, normalize(a)));
        return ok ? "correct" : "incorrect";
      }
      case "image_puzzle": {
        // The puzzle is shared: validate against whatever image the operator
        // currently has on the board, not a per-guest assignment.
        const piece = puzzleById(await this.projection.currentPuzzleId());
        const haystack = normalize(rawText);
        const ok = piece.answers.some((a) => containsPhrase(haystack, normalize(a)));
        return ok ? "correct" : "incorrect";
      }
      case "word_pair": {
        const partners = (await this.resolvePartners(partnerGameIds)).filter(
          (p) => p.id !== participant.id,
        );
        if (partners.length === 0) return "invalid";
        const ok = partners.some((p) => wordsPair(participant.secretWord, p.secretWord));
        return ok ? "correct" : "incorrect";
      }
      default:
        return assertNever(rule);
    }
  }

  private async resolvePartners(gameIds: string[]): Promise<Participant[]> {
    const found = await Promise.all(
      gameIds.map((gid) => this.repos.participants.findByGameId(this.eventId, gid)),
    );
    return found.filter((p): p is Participant => p !== null && !p.eliminated);
  }

  /** Assign the next uncompleted mission in sequence; idle when the labyrinth is solved. */
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
