import { GEMS } from "@/constants/gems";
import { MISSION_BY_ID, MISSION_SEQUENCE } from "@/constants/missions";
import type { Participant } from "@/domain/types";

/** A guest's status on one game, plus which game they're currently on. */
export interface QuestStageView {
  id: string;
  title: string;
  status: string;
}
export interface StageView {
  stage: string | null;
  quests: QuestStageView[];
}

/** A quest no longer in play (cleared or skipped past). */
const FINISHED = new Set(["completed", "skipped"]);

/**
 * Derive the game a guest is on for the console. The conversation pointer wins when
 * it sits on a game still in play (an operator override or a real solve advancing
 * it); otherwise fall back to the first unfinished quest, mirroring the web player.
 */
export function stageView(statuses: Record<string, string>, pointer: string | null): StageView {
  const quests: QuestStageView[] = MISSION_SEQUENCE.map((id) => ({
    id,
    title: MISSION_BY_ID.get(id)?.title ?? id,
    status: statuses[id] ?? "pending",
  }));
  const firstUnfinished = MISSION_SEQUENCE.find((id) => !FINISHED.has(statuses[id] ?? "")) ?? null;
  const stage = pointer && !FINISHED.has(statuses[pointer] ?? "") ? pointer : firstUnfinished;
  return { stage, quests };
}

/** The participant shape the operator console consumes (matches `OperatorParticipant`). */
export function participantView(p: Participant, stage?: StageView) {
  return {
    id: p.id,
    gameId: p.gameId,
    displayName: p.displayName,
    gem: p.gem,
    gemLabel: GEMS[p.gem].label,
    gemHex: GEMS[p.gem].hex,
    secretWord: p.secretWord,
    score: p.score,
    eliminated: p.eliminated,
    phone: p.phone,
    email: p.email,
    stage: stage?.stage ?? null,
    quests: stage?.quests ?? [],
  };
}
