/**
 * Mission catalog (the "Dedalus Labyrinth"). Product owns this at build freeze.
 * Deterministic code decides pass/fail; the agent only delivers clues and copy.
 *
 * `{gem}`, `{word}`, `{game_id}` placeholders are filled per-participant when the
 * mission prompt is sent.
 */

export type MissionType = "color_quest" | "word_match" | "clue_quest" | "puzzle";

export type ValidationRule =
  | { kind: "distinct_gems"; count: number }
  | { kind: "word_pair" }
  | { kind: "answer_key"; answers: readonly string[] };

export interface MissionTemplate {
  readonly id: string;
  readonly type: MissionType;
  readonly title: string;
  readonly promptCopy: string;
  readonly points: number;
  readonly requiresPartner: boolean;
  readonly projectionEffect: string;
  readonly validation: ValidationRule;
  /** One-line nudge sent on a wrong answer. Never the answer itself. */
  readonly hint?: string;
}

/**
 * Half-phrase words. Each guest gets one as their `secret_word` at check-in; the
 * word-match mission is to find the guest holding the complement. Pairs keep the
 * room solvable: for every "give" there is a "wings".
 */
export const WORD_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["give", "wings"],
  ["drip", "ship"],
  ["run", "way"],
  ["agent", "phone"],
  ["lume", "studio"],
  ["thread", "maze"],
  ["sub", "second"],
  ["open", "call"],
  ["night", "circuit"],
  ["cloud", "native"],
];

export const MISSIONS: readonly MissionTemplate[] = [
  {
    id: "color-constellation",
    type: "color_quest",
    title: "Constellation",
    promptCopy:
      "Find two guests whose gems differ from yours and from each other, then text me all three game IDs together (yours included).",
    points: 100,
    requiresPartner: true,
    projectionEffect: "constellation",
    validation: { kind: "distinct_gems", count: 3 },
    hint: "three guests, three different gems, none of them the same.",
  },
  {
    id: "word-thread",
    type: "word_match",
    title: "The Thread",
    promptCopy:
      'Your word is "{word}". Somewhere here is the guest who completes it. Find them, then text me the full phrase and their game ID.',
    points: 150,
    requiresPartner: true,
    projectionEffect: "thread",
    validation: { kind: "word_pair" },
    hint: "find the guest whose word completes yours, then text the phrase and their game ID.",
  },
  {
    id: "clue-ariadne",
    type: "clue_quest",
    title: "Who Held the Thread",
    promptCopy:
      "Daedalus built a maze no one could escape. One person handed the hero a single thread and undid the whole thing. Name them.",
    points: 120,
    requiresPartner: false,
    projectionEffect: "clue",
    validation: { kind: "answer_key", answers: ["ariadne"] },
    hint: "she loved the hero and handed him the thread.",
  },
  {
    id: "puzzle-wings",
    type: "puzzle",
    title: "What It Gives",
    promptCopy:
      "Find the statue at the threshold. Finish the line: Dedalus gives every agent its ___.",
    points: 120,
    requiresPartner: false,
    projectionEffect: "puzzle",
    validation: { kind: "answer_key", answers: ["wings", "give your agent wings", "your wings"] },
    hint: "it's what Dedalus says it gives every agent.",
  },
] as const;

export const MISSION_BY_ID: ReadonlyMap<string, MissionTemplate> = new Map(
  MISSIONS.map((m) => [m.id, m]),
);

/** The mission handed out at check-in, then the order missions advance. */
export const FIRST_MISSION_ID = "color-constellation";
export const MISSION_SEQUENCE: readonly string[] = MISSIONS.map((m) => m.id);

export const PARTICIPANT_MISSION_STATUSES = [
  "assigned",
  "submitted",
  "completed",
  "failed",
  "skipped",
] as const;
export type ParticipantMissionStatus = (typeof PARTICIPANT_MISSION_STATUSES)[number];
