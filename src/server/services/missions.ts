import { FLOWS } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { assertNever } from "@/lib/assert";
import {
  MISSION_BY_ID,
  MISSION_SEQUENCE,
  type MissionTemplate,
  type ValidationRule,
} from "@/constants/missions";
import { newId } from "@/domain/ids";
import { extractGameIds, wordsPair } from "@/domain/mission-parse";
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
      .replaceAll("{game_id}", participant.gameId);
  }

  /** The current mission for a participant, assigning the next one if none is active. */
  deliverCurrent(participant: Participant, conversation: Conversation): DeliveredMission | null {
    const active = this.current(conversation);
    if (active) return { mission: active, prompt: this.renderPrompt(active, participant) };
    const next = this.advance(participant, conversation);
    return next ? { mission: next, prompt: this.renderPrompt(next, participant) } : null;
  }

  submit(participant: Participant, conversation: Conversation, rawText: string): MissionOutcome {
    const mission = this.current(conversation);
    if (!mission) return { kind: "no_mission" };

    const partnerGameIds = extractGameIds(rawText);
    const result = this.validate(mission.validation, participant, rawText, partnerGameIds);

    this.repos.participantMissions.markSubmitted(participant.id, mission.id);
    this.repos.missionEvents.insert({
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

    const transitioned = this.repos.participantMissions.markCompleted(
      participant.id,
      mission.id,
      mission.points,
    );
    if (!transitioned) return { kind: "already" };

    const newScore = this.repos.participants.addScore(participant.id, mission.points);
    this.projection.emit("mission.completed", {
      gameId: participant.gameId,
      missionId: mission.id,
      title: mission.title,
      effect: mission.projectionEffect,
    });
    this.projection.emit("score.updated", { gameId: participant.gameId, score: newScore });

    const next = this.advance(participant, conversation);
    return {
      kind: "correct",
      points: mission.points,
      nextPrompt: next ? this.renderPrompt(next, participant) : null,
    };
  }

  /** Deterministic pass/fail. The agent never decides this. */
  private validate(
    rule: ValidationRule,
    participant: Participant,
    rawText: string,
    partnerGameIds: string[],
  ): MissionResult {
    switch (rule.kind) {
      case "answer_key": {
        const haystack = normalize(rawText);
        const ok = rule.answers.some((a) => containsPhrase(haystack, normalize(a)));
        return ok ? "correct" : "incorrect";
      }
      case "distinct_gems": {
        const partners = this.resolvePartners(partnerGameIds);
        if (partners.length === 0) return "incorrect";
        const gems = new Set<string>([participant.gem, ...partners.map((p) => p.gem)]);
        return gems.size >= rule.count ? "correct" : "incorrect";
      }
      case "word_pair": {
        const partners = this.resolvePartners(partnerGameIds).filter((p) => p.id !== participant.id);
        if (partners.length === 0) return "invalid";
        const ok = partners.some((p) => wordsPair(participant.secretWord, p.secretWord));
        return ok ? "correct" : "incorrect";
      }
      default:
        return assertNever(rule);
    }
  }

  private resolvePartners(gameIds: string[]): Participant[] {
    const out: Participant[] = [];
    for (const gid of gameIds) {
      const p = this.repos.participants.findByGameId(this.eventId, gid);
      if (p && !p.eliminated) out.push(p);
    }
    return out;
  }

  /** Assign the next uncompleted mission in sequence; idle when the labyrinth is solved. */
  advance(participant: Participant, conversation: Conversation): MissionTemplate | null {
    const completed = new Set(this.repos.participantMissions.completedMissionIds(participant.id));
    const nextId = MISSION_SEQUENCE.find((id) => !completed.has(id)) ?? null;
    if (!nextId) {
      this.conversations.setFlow(conversation.id, FLOWS.IDLE, null);
      return null;
    }
    this.repos.participantMissions.assign(this.eventId, participant.id, nextId);
    this.conversations.setFlow(conversation.id, FLOWS.MISSION, nextId);
    return MISSION_BY_ID.get(nextId) ?? null;
  }
}
