import {
  allQuestsDoneCopy,
  missionBypassedCopy,
  missionCorrectCopy,
  missionDuplicatePartnerCopy,
  missionPartnerInvalidCopy,
  missionWrongCopy,
  riddleHintCopy,
  riddleProgressCopy,
} from "@/constants/copy";
import { FLOWS } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import {
  MISSION_BY_ID,
  COLOR_QUEST_PARTNER_COUNT,
  FIRST_MISSION_ID,
  MISSION_SEQUENCE,
  RIDDLE_MISSION_ID,
  RIDDLE_QUEST_COUNT,
  type MissionTemplate,
} from "@/constants/missions";
import { assertNever } from "@/lib/assert";
import { QUEST_BASE, partnerQuestPoints, revealedRiddlePoints, speedBonus } from "@/domain/scoring";
import { newId } from "@/domain/ids";
import {
  extractGameIds,
  isValidColorCombo,
  matchBypassCode,
  matchRiddleAnswer,
  parseRiddleAttempt,
  riddlesForParticipant,
} from "@/domain/mission-parse";
import { riddleNudge, type RiddleNudge } from "@/domain/riddle-hints";
import type { Clue } from "@/constants/clues";
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
  | { kind: "riddle_incorrect"; riddleNumber: number; nudge: RiddleNudge }
  | { kind: "partner_invalid" }
  | { kind: "duplicate_partner" }
  | { kind: "riddle_progress"; solved: number; total: number; nextRiddlePrompt: string }
  | { kind: "bypassed"; title: string; nextPrompt: string | null }
  | { kind: "already" };

export interface DeliveredMission {
  mission: MissionTemplate;
  prompt: string;
}

/** The single guest-facing line for a mission outcome, shared by the agent tool and the web player. */
export function missionOutcomeSay(outcome: MissionOutcome): string {
  switch (outcome.kind) {
    case "correct":
      return missionCorrectCopy({ points: outcome.points, nextMissionPrompt: outcome.nextPrompt ?? undefined });
    case "incorrect":
      return missionWrongCopy(outcome.hint);
    case "riddle_incorrect":
      return riddleHintCopy({ riddleNumber: outcome.riddleNumber, nudge: outcome.nudge });
    case "partner_invalid":
      return missionPartnerInvalidCopy();
    case "duplicate_partner":
      return missionDuplicatePartnerCopy();
    case "riddle_progress":
      return riddleProgressCopy({
        solved: outcome.solved,
        total: outcome.total,
        nextRiddlePrompt: outcome.nextRiddlePrompt,
      });
    case "bypassed":
      return missionBypassedCopy({ title: outcome.title, nextMissionPrompt: outcome.nextPrompt ?? undefined });
    case "already":
      return "You already solved that one. Stay near the screen.";
    case "no_mission":
      return allQuestsDoneCopy();
    default:
      return assertNever(outcome);
  }
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
    const finished = new Set(await this.repos.participantMissions.finishedMissionIds(participantId));
    const done = MISSION_SEQUENCE.filter((id) => finished.has(id)).length;
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
    return `Three riddles. Reply with the riddle number and your one-word answer, like "2: cache" (any order).\n\n${lines}`;
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
    // A staff skip-phrase short-circuits everything: it retires its game (no points)
    // and surfaces the next, regardless of which quest is currently active.
    const bypass = matchBypassCode(rawText);
    if (bypass) return this.bypassGame(participant, conversation, bypass);

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

    // Quests complete in any order, so route by what the message actually proves,
    // not a fixed sequence. Two other guests whose gems join the solver's own to
    // form a wheel triangle is a color solve; a named partner whose secret word
    // appears is a word solve. A wrong count is only a failed *color* attempt
    // when no word match is possible.
    if (
      color &&
      !completed.has(COLOR_MISSION_ID) &&
      fresh.length === COLOR_QUEST_PARTNER_COUNT &&
      isValidColorCombo([participant.gem, ...fresh.map((p) => p.gem)])
    ) {
      return this.complete(participant, conversation, color, rawText, fresh.map((p) => p.gameId));
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

  /**
   * Riddle quest: solve the guest's three riddles in any order. A miss escalates
   * help on the riddle they're stuck on (the one they filed under, else the next
   * unsolved): two progressively sharper hints, then a reveal of the answer. A
   * riddle whose answer we revealed still scores, at the reduced revealed rate.
   */
  private async submitRiddle(
    participant: Participant,
    conversation: Conversation,
    rawText: string,
  ): Promise<MissionOutcome> {
    const riddle = MISSION_BY_ID.get(RIDDLE_MISSION_ID);
    if (!riddle) return { kind: "no_mission" };

    const riddles = riddlesForParticipant(participant.gameId);
    const solvedBefore = new Set(await this.repos.riddleSolves.solvedIds(participant.id));
    // Numbers bind: "2: cache" only solves riddle 2, so a right answer under the wrong
    // number is rejected. A bare word still matches any unsolved riddle, in any order.
    const match = matchRiddleAnswer(riddles, rawText, solvedBefore);

    if (!match) {
      return this.nudgeStuckRiddle(participant, riddles, solvedBefore, rawText);
    }

    // A revealed riddle scores at the reduced rate; the persisted reveal is the
    // canonical signal, so solving riddles out of order never mis-credits one.
    const revealed = new Set(await this.repos.riddleReveals.revealedIds(participant.id));
    const baseFor = (id: string): number =>
      revealed.has(id) ? revealedRiddlePoints(QUEST_BASE.riddle_quest) : QUEST_BASE.riddle_quest;
    const thisBase = baseFor(match.id);

    const firstSolve = await this.repos.riddleSolves.markSolved(this.eventId, participant.id, match.id);
    await this.repos.participantMissions.assign(this.eventId, participant.id, RIDDLE_MISSION_ID);
    await this.repos.participantMissions.markSubmitted(participant.id, RIDDLE_MISSION_ID);
    await this.recordEvent(participant, RIDDLE_MISSION_ID, rawText, [], "correct", firstSolve ? thisBase : 0);

    if (firstSolve) {
      const score = await this.repos.participants.addScore(participant.id, thisBase);
      await this.projection.emit("score.updated", { gameId: participant.gameId, score });
    }

    const solvedCount = solvedBefore.size + (firstSolve ? 1 : 0);
    if (solvedCount >= RIDDLE_QUEST_COUNT) {
      // Quickness bonus for finishing the riddle round, by how many already have.
      const prior = await this.repos.participantMissions.completedCountForMission(this.eventId, RIDDLE_MISSION_ID);
      const bonus = speedBonus(prior);
      // Sum the actual per-riddle bases (revealed ones count less) for the record.
      const solvedIds = [...solvedBefore, ...(firstSolve ? [match.id] : [])];
      const baseTotal = solvedIds.reduce((sum, id) => sum + baseFor(id), 0);
      const transitioned = await this.repos.participantMissions.markCompleted(
        participant.id,
        RIDDLE_MISSION_ID,
        baseTotal + bonus,
      );
      if (transitioned) {
        const score = await this.repos.participants.addScore(participant.id, bonus);
        await this.projection.emit("mission.completed", {
          gameId: participant.gameId,
          missionId: RIDDLE_MISSION_ID,
          title: riddle.title,
          effect: riddle.projectionEffect,
        });
        await this.projection.emit("score.updated", { gameId: participant.gameId, score });
      }
      const next = await this.advance(participant, conversation);
      return {
        kind: "correct",
        points: thisBase + (transitioned ? bonus : 0),
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

  /**
   * A riddle answer that matched nothing. Log the miss and escalate help on the
   * riddle the guest is working: the one they filed under ("2: ..."), else the
   * next unsolved. Two hints, then a reveal of the answer (recorded, so the
   * eventual solve scores at the reduced rate).
   */
  private async nudgeStuckRiddle(
    participant: Participant,
    riddles: Clue[],
    solvedBefore: ReadonlySet<string>,
    rawText: string,
  ): Promise<MissionOutcome> {
    await this.recordEvent(participant, RIDDLE_MISSION_ID, rawText, [], "incorrect", 0);

    const { number } = parseRiddleAttempt(rawText);
    const targeted = number !== null ? riddles[number - 1] : undefined;
    const focus =
      targeted && !solvedBefore.has(targeted.id)
        ? targeted
        : riddles.find((r) => !solvedBefore.has(r.id));
    if (!focus) return { kind: "incorrect", hint: MISSION_BY_ID.get(RIDDLE_MISSION_ID)?.hint };

    const attempts = await this.riddleWrongStreak(participant.id);
    const nudge = riddleNudge(focus, attempts);
    if (nudge.kind === "reveal") {
      await this.repos.riddleReveals.markRevealed(this.eventId, participant.id, focus.id);
    }
    const riddleNumber = riddles.findIndex((r) => r.id === focus.id) + 1;
    return { kind: "riddle_incorrect", riddleNumber, nudge };
  }

  /**
   * Consecutive wrong riddle answers since the guest's last riddle solve. A solve
   * breaks the streak, so each riddle they move onto starts the hint ladder fresh.
   * Counted from logged mission events, so there is no separate counter to sync.
   */
  private async riddleWrongStreak(participantId: string): Promise<number> {
    const events = await this.repos.missionEvents.listByParticipant(participantId);
    let streak = 0;
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (event.missionId !== RIDDLE_MISSION_ID) continue;
      if (event.result !== "incorrect") break;
      streak += 1;
    }
    return streak;
  }

  /** Mark a partner quest correct, score it, fan out projection, and queue the next quest. */
  private async complete(
    participant: Participant,
    conversation: Conversation,
    mission: MissionTemplate,
    rawText: string,
    partnerGameIds: string[],
  ): Promise<MissionOutcome> {
    // Score on the quickness of this solve and how many new partners it named.
    const prior = await this.repos.participantMissions.completedCountForMission(this.eventId, mission.id);
    const points = partnerQuestPoints(mission.type, prior, partnerGameIds.length);

    await this.repos.participantMissions.assign(this.eventId, participant.id, mission.id);
    await this.repos.participantMissions.markSubmitted(participant.id, mission.id);
    await this.recordEvent(participant, mission.id, rawText, partnerGameIds, "correct", points);

    const transitioned = await this.repos.participantMissions.markCompleted(
      participant.id,
      mission.id,
      points,
    );
    if (!transitioned) return { kind: "already" };

    const newScore = await this.repos.participants.addScore(participant.id, points);
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
      points,
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
      return "for the color quest, find two other guests whose colors complete your triangle and text their game IDs.";
    }
    if (!completed.has(WORD_MISSION_ID)) {
      return "for the word quest, find the guest whose secret word completes a phrase with yours (the main screen lists the pairs), then text me their game ID and that word.";
    }
    return "you've cleared the labyrinth.";
  }

  /** Surface the next incomplete quest (any order); idle when all three are done. */
  async advance(participant: Participant, conversation: Conversation): Promise<MissionTemplate | null> {
    const finished = new Set(await this.repos.participantMissions.finishedMissionIds(participant.id));
    const nextId = MISSION_SEQUENCE.find((id) => !finished.has(id)) ?? null;
    if (!nextId) {
      await this.conversations.setFlow(conversation.id, FLOWS.IDLE, null);
      return null;
    }
    await this.repos.participantMissions.assign(this.eventId, participant.id, nextId);
    await this.conversations.setFlow(conversation.id, FLOWS.MISSION, nextId);
    return MISSION_BY_ID.get(nextId) ?? null;
  }

  /** Assign the first quest and open the mission flow (first MISSION/STATUS once the game starts). */
  async unlockGameplay(participant: Participant, conversation: Conversation): Promise<void> {
    await this.repos.participantMissions.assign(this.eventId, participant.id, FIRST_MISSION_ID);
    await this.conversations.setFlow(conversation.id, FLOWS.MISSION, FIRST_MISSION_ID);
  }

  /** Exemplar bypass: skip color quest and surface the next quest. */
  async skipColorQuest(participant: Participant, conversation: Conversation): Promise<string | null> {
    const color = MISSION_BY_ID.get(COLOR_MISSION_ID);
    if (!color) return null;
    const outcome = await this.bypassGame(participant, conversation, color);
    return outcome.kind === "bypassed" ? outcome.nextPrompt : null;
  }

  /** Retire one game (skip it, no points) and surface the next incomplete quest. */
  async bypassGame(
    participant: Participant,
    conversation: Conversation,
    mission: MissionTemplate,
  ): Promise<MissionOutcome> {
    const finished = new Set(await this.repos.participantMissions.finishedMissionIds(participant.id));
    if (!finished.has(mission.id)) {
      await this.repos.participantMissions.markSkipped(this.eventId, participant.id, mission.id);
    }
    const next = await this.advance(participant, conversation);
    return {
      kind: "bypassed",
      title: mission.title,
      nextPrompt: next ? this.renderPrompt(next, participant) : null,
    };
  }

  /**
   * Operator override: put a guest on a specific game. Sets the conversation pointer
   * (the text/agent surface) and reopens the game if it had been skipped or failed,
   * so it surfaces as current on both the text thread and the web player. Completed
   * games are left intact, so this never double-scores or erases a real win.
   */
  async setStage(
    participant: Participant,
    conversation: Conversation,
    missionId: string,
  ): Promise<{ prompt: string } | null> {
    const mission = MISSION_BY_ID.get(missionId);
    if (!mission) return null;
    const existing = await this.repos.participantMissions.find(participant.id, missionId);
    if (!existing) {
      await this.repos.participantMissions.assign(this.eventId, participant.id, missionId);
    } else if (existing.status === "skipped" || existing.status === "failed") {
      await this.repos.participantMissions.setStatus(participant.id, missionId, "assigned");
    }
    await this.conversations.setFlow(conversation.id, FLOWS.MISSION, missionId);
    return { prompt: this.renderPrompt(mission, participant) };
  }

  /** {@link setStage} keyed by participant id (the operator console path). */
  async setStageForParticipant(
    participantId: string,
    missionId: string,
  ): Promise<{ gameId: string; prompt: string } | null> {
    const participant = await this.repos.participants.findById(participantId);
    if (!participant) return null;
    const conversation = await this.conversations.resolveForParticipant(participantId);
    const res = await this.setStage(participant, conversation, missionId);
    return res ? { gameId: participant.gameId, prompt: res.prompt } : null;
  }
}
