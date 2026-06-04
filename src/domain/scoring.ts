/**
 * Quest scoring. Points reward two things the night is designed around: being
 * quick and meeting new people.
 *
 * - base: a flat award for solving the quest (riddle base is per-riddle).
 * - speed: a completion-order bonus. The k-th guest to finish a quest (k = how
 *   many already finished it) earns a decaying bonus, so the first solvers earn
 *   the most and late solvers still get the floor.
 * - uniqueness: a per-partner bonus for each distinct guest you successfully team
 *   with (the color quest names three, the word quest one). Partners never repeat
 *   across quests (the duplicate-partner guard), so every one is someone new.
 */

import type { MissionType } from "@/constants/missions";

export const QUEST_BASE: Record<MissionType, number> = {
  color_quest: 50,
  word_match: 50,
  riddle_quest: 30, // per riddle; three complete the quest
};

export const SPEED_BONUS_FIRST = 60;
export const SPEED_BONUS_STEP = 5;
export const SPEED_BONUS_FLOOR = 10;

/** Decaying quickness bonus by how many guests already finished this quest. */
export function speedBonus(priorCompletions: number): number {
  return Math.max(SPEED_BONUS_FLOOR, SPEED_BONUS_FIRST - priorCompletions * SPEED_BONUS_STEP);
}

export const UNIQUE_PARTNER_BONUS = 15;

/** Points for a partner quest (color/word): base + quickness + a bonus per new partner. */
export function partnerQuestPoints(
  type: MissionType,
  priorCompletions: number,
  uniquePartners: number,
): number {
  return QUEST_BASE[type] + speedBonus(priorCompletions) + uniquePartners * UNIQUE_PARTNER_BONUS;
}
