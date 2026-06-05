/**
 * The riddle pool for the riddle quest: 8 riddles total. Each resolves to a single
 * systems term that hides a second, everyday meaning; `answers` lists the accepted
 * spellings/aliases. Each guest gets 3 of these (see `riddlesForParticipant` in
 * domain/mission-parse) and must solve all three. Product owns this content.
 */

export interface Clue {
  readonly id: string;
  readonly prompt: string;
  readonly answers: readonly string[];
}

export const CLUES: readonly Clue[] = [
  {
    id: "cache",
    prompt:
      "In systems, this is the fast local store that keeps hot data close at hand. Out in the world, it is a hidden stash you bury to dig up later.",
    answers: ["cache"],
  },
  {
    id: "daemon",
    prompt:
      "In systems, this is a background process quietly doing work out of sight. Elsewhere, it sounds like the thing haunting your codebase at 2 AM.",
    answers: ["daemon", "demon"],
  },
  {
    id: "terminal",
    prompt:
      "This is the text interface that gives direct access to a machine. Also: where journeys begin, end, or get delayed somewhere near Jamaica.",
    answers: ["terminal"],
  },
  {
    id: "persistence",
    prompt:
      "This is the quality that lets state survive over time in Dedalus Machines. Also: the trait required to survive the L train on a bad day.",
    answers: ["persistence", "persistent", "persist"],
  },
  {
    id: "runtime",
    prompt:
      "This is the environment where code, agents, or processes actually run. Also: the length of the average Broadway show, around two and a half hours.",
    answers: ["runtime", "run time"],
  },
  {
    id: "sleep",
    prompt:
      "On virtual machines, this is the zero-cost state where compute pauses while storage remains. In NYC, this is something that never happens.",
    answers: ["sleep"],
  },
  {
    id: "session",
    prompt:
      "This is a protected container for context, state, or identity over a bounded interaction. Elsewhere, it's what a spa, Stripe, an art fair, and music producers have in common.",
    answers: ["session"],
  },
  {
    id: "automata",
    prompt:
      "These are devices or figures designed to operate by themselves. They also describe behavior so patterned it barely seems conscious.",
    answers: ["automata", "automaton", "automatons"],
  },
];

export const CLUE_BY_ID: ReadonlyMap<string, Clue> = new Map(CLUES.map((c) => [c.id, c]));
