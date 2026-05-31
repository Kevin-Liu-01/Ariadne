/**
 * Mission catalog (the "Dedalus Labyrinth"). Product owns this at build freeze.
 * Deterministic code decides pass/fail; the agent only delivers clues and copy.
 *
 * `{gem}`, `{word}`, `{game_id}` placeholders are filled per-participant when the
 * mission prompt is sent.
 */

import type { GemId } from "@/constants/gems";

export type MissionType = "color_quest" | "word_match" | "clue_quest" | "puzzle";

export type ValidationRule =
  | { kind: "color_combo" }
  | { kind: "word_pair" }
  | { kind: "clue" }
  | { kind: "image_puzzle" }
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
 * word-match mission is to find the guest holding the complement that completes
 * the two-word phrase.
 *
 * The brand slogans lead — assembled, they spell the event's lines — followed by
 * the Run(way)time atmospheric word bank (Scenario 3). Pairs are laid out [a, b]
 * and handed out in order (see `assignSecretWord`), so both halves land early and
 * the match stays solvable. Some words appear in more than one pair (e.g. "open");
 * `wordsPair` accepts any listed pairing, so that's fine.
 */
export const WORD_PAIRS: ReadonlyArray<readonly [string, string]> = [
  // Brand slogans: "give your agent wings", "drip and ship", "runway", AgentPhone,
  // Lume Studios. First, so these meaningful pairs are the most likely to be used.
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
  // Run(way)time atmospheric word bank — tech + myth pairs.
  ["agents", "run"],
  ["models", "train"],
  ["prompts", "branch"],
  ["tokens", "flow"],
  ["vectors", "dedalus"],
  ["systems", "wake"],
  ["runtimes", "persist"],
  ["machines", "sleep"],
  ["servers", "scale"],
  ["dedalus", "route"],
  ["signals", "pulse"],
  ["kernels", "panic"],
  ["threads", "spawn"],
  ["queues", "build"],
  ["graphs", "expand"],
  ["nodes", "connect"],
  ["circuits", "close"],
  ["caches", "warm"],
  ["logs", "stream"],
  ["processes", "fork"],
  ["daemons", "watch"],
  ["jobs", "retry"],
  ["builds", "pass"],
  ["tests", "fail"],
  ["tools", "call"],
  ["workflows", "break"],
  ["agents", "coordinate"],
  ["swarms", "gather"],
  ["models", "reason"],
  ["contexts", "shift"],
  ["memories", "surface"],
  ["prompts", "echo"],
  ["systems", "recover"],
  ["machines", "boot"],
  ["clusters", "rebalance"],
  ["events", "trigger"],
  ["tasks", "queue"],
  ["sessions", "expire"],
  ["users", "prompt"],
  ["operators", "debug"],
  ["pipelines", "stall"],
  ["workers", "idle"],
  ["networks", "split"],
  ["programs", "compile"],
  ["engines", "infer"],
  ["browsers", "crawl"],
  ["miners", "extract"],
  ["scrapers", "parse"],
  ["indexes", "update"],
  ["archives", "open"],
  ["labyrinths", "shift"],
  ["oracles", "whisper"],
  ["threads", "unwind"],
  ["gates", "open"],
  ["mirrors", "fracture"],
  ["shadows", "linger"],
  ["flames", "flicker"],
  ["temples", "collapse"],
  ["chambers", "echo"],
  ["corridors", "narrow"],
  ["minotaurs", "roam"],
  ["heroes", "descend"],
  ["pilgrims", "gather"],
  ["rituals", "begin"],
  ["prophecies", "unfold"],
  ["myths", "persist"],
  ["machines", "dream"],
  ["signals", "vanish"],
  ["voices", "guide"],
  ["names", "fade"],
  ["masks", "slip"],
  ["crowds", "scatter"],
  ["puzzles", "unlock"],
  ["clues", "converge"],
  ["images", "distort"],
  ["patterns", "emerge"],
  ["fabrics", "shimmer"],
  ["garments", "move"],
  ["runways", "glow"],
  ["spotlights", "sweep"],
  ["projections", "bloom"],
  ["visuals", "pulse"],
  ["speakers", "shake"],
  ["basslines", "drop"],
  ["playlists", "evolve"],
  ["dancers", "gather"],
  ["avatars", "duel"],
  ["rankings", "change"],
  ["faces", "tile"],
  ["screens", "refresh"],
  ["leaders", "fall"],
  ["challengers", "rise"],
  ["bosses", "spawn"],
  ["secrets", "leak"],
  ["commands", "recurse"],
  ["ciphers", "unlock"],
  ["keys", "rotate"],
  ["portals", "open"],
  ["worlds", "merge"],
  ["futures", "branch"],
];

/**
 * Winning color-quest combinations, as multisets of gem ids. A group's gems must
 * match one exactly. Gems encode colors (amethyst=purple, garnet=red,
 * moonstone=white, peridot=green, aquamarine=blue, topaz=yellow); the combos are
 * color theory — a matched pair, or two colors plus the one they mix into. The
 * "two purples + one other" rule is handled in the validator, not listed here.
 */
export const COLOR_COMBOS: readonly (readonly GemId[])[] = [
  ["garnet", "amethyst"], // red + purple
  ["moonstone", "peridot"], // white + green
  ["garnet", "aquamarine", "amethyst"], // red + blue -> purple
  ["aquamarine", "topaz", "peridot"], // blue + yellow -> green
];

export const MISSIONS: readonly MissionTemplate[] = [
  {
    id: "color-constellation",
    type: "color_quest",
    title: "Constellation",
    promptCopy:
      "Your gem is a color. Find the guests whose colors complete yours — a matched pair, or colors that mix into a third. Text me everyone's game IDs, yours included.",
    points: 100,
    requiresPartner: true,
    projectionEffect: "constellation",
    validation: { kind: "color_combo" },
    hint: "color theory: red+blue make purple, blue+yellow make green. a matched pair works too (red+purple, white+green), or two purples plus one other.",
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
    id: "clue-labyrinth",
    type: "clue_quest",
    title: "The Labyrinth",
    promptCopy: "A riddle from the labyrinth: {clue} Text me the one word it points to.",
    points: 120,
    requiresPartner: false,
    projectionEffect: "clue",
    validation: { kind: "clue" },
    hint: "one word — a systems term hiding a second, everyday meaning.",
  },
  {
    id: "puzzle-decode",
    type: "puzzle",
    title: "Decode the Labyrinth",
    promptCopy:
      "Look at the big screen. The labyrinth is showing the room a cropped image. Text me what it is — name the myth, object, place, or source.",
    points: 120,
    requiresPartner: false,
    projectionEffect: "puzzle",
    validation: { kind: "image_puzzle" },
    hint: "look harder — it's pulled from Greek myth, the Daedalus story, or our own merch. one clear name is enough.",
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
