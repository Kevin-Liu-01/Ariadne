/**
 * Mission catalog (the "Dedalus Labyrinth"). Product owns this at build freeze.
 * Deterministic code decides pass/fail; the agent only delivers clues and copy.
 *
 * `{gem}`, `{word}`, `{game_id}` placeholders are filled per-participant when the
 * mission prompt is sent.
 */

import type { GemId } from "@/constants/gems";

export type MissionType = "color_quest" | "word_match" | "riddle_quest";

export type ValidationRule =
  | { kind: "color_combo" }
  | { kind: "word_collab" }
  | { kind: "riddle_set" };

/** Points per riddle solved. Three riddles complete the quest for the total below. */
export const RIDDLE_POINTS_EACH = 50;
export const RIDDLE_QUEST_COUNT = 3;

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
 * The brand slogans lead (assembled, they spell the event's lines), followed by
 * the Run(time)way atmospheric word bank (Scenario 3). Pairs are laid out [a, b]
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
  // Run(time)way atmospheric word bank: tech + myth pairs.
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

/** Primary or secondary color-wheel triangle (validated in gem-wheel.ts). */
export const COLOR_COMBOS: readonly (readonly GemId[])[] = [
  ["garnet", "topaz", "aquamarine"],
  ["amethyst", "peridot", "moonstone"],
];

export const MISSIONS: readonly MissionTemplate[] = [
  {
    id: "color-constellation",
    type: "color_quest",
    title: "Color Quest",
    promptCopy:
      "Your gem is a color on the wheel. Find three guests whose colors form a triangle: all primaries (red, yellow, blue) or all secondaries (purple, green, orange). Hint: what three hues sit evenly across the color wheel? Text me their three game IDs.",
    points: 100,
    requiresPartner: true,
    projectionEffect: "constellation",
    validation: { kind: "color_combo" },
    hint: "You need exactly three other guests, each a different wheel color, forming either the primary triangle or the secondary triangle.",
  },
  {
    id: "word-thread",
    type: "word_match",
    title: "Word Quest",
    promptCopy:
      "Team up with any other guest you haven't paired with yet. Ask them their secret word, then text me their game ID and that word.",
    points: 150,
    requiresPartner: true,
    projectionEffect: "thread",
    validation: { kind: "word_collab" },
    hint: "find a new partner, ask their secret word, then text me their game ID and that word.",
  },
  {
    id: "riddle-labyrinth",
    type: "riddle_quest",
    title: "Riddle Quest",
    promptCopy: "Three riddles from the labyrinth. Solve each and text me the one-word answer.",
    points: RIDDLE_POINTS_EACH * RIDDLE_QUEST_COUNT,
    requiresPartner: false,
    projectionEffect: "labyrinth",
    validation: { kind: "riddle_set" },
    hint: "one word, a systems term hiding a second, everyday meaning.",
  },
] as const;

export const MISSION_BY_ID: ReadonlyMap<string, MissionTemplate> = new Map(
  MISSIONS.map((m) => [m.id, m]),
);

/** The three quests can be completed in any order; this is just a stable display order. */
export const FIRST_MISSION_ID = "color-constellation";
export const MISSION_SEQUENCE: readonly string[] = MISSIONS.map((m) => m.id);
export const RIDDLE_MISSION_ID = "riddle-labyrinth";

export const PARTICIPANT_MISSION_STATUSES = [
  "assigned",
  "submitted",
  "completed",
  "failed",
  "skipped",
] as const;
export type ParticipantMissionStatus = (typeof PARTICIPANT_MISSION_STATUSES)[number];
