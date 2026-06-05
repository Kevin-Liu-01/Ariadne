/**
 * The riddle pool for the riddle quest: 8 riddles total. Each resolves to a single
 * systems term that hides a second, everyday meaning; `answers` lists the accepted
 * spellings/aliases. Each guest gets 3 of these (see `riddlesForParticipant` in
 * domain/mission-parse) and must solve all three. Product owns this content.
 *
 * `hints` is the progressive nudge ladder for a guest stuck on this riddle: each
 * miss surfaces the next hint (gentle, then sharper), and once the ladder is spent
 * the answer is revealed (see `domain/riddle-hints`). Hints must never be an
 * accepted answer verbatim, and stay dash-free like the rest of the copy.
 */

export interface Clue {
  readonly id: string;
  readonly prompt: string;
  readonly answers: readonly string[];
  readonly hints: readonly string[];
}

export const CLUES: readonly Clue[] = [
  {
    id: "cache",
    prompt:
      "In systems, this is the fast local store that keeps hot data close at hand. Out in the world, it is a hidden stash you bury to dig up later.",
    answers: ["cache"],
    hints: [
      "Think about where a system keeps hot data so it never has to fetch the same thing twice.",
      "Squirrels and treasure hunters both make one of these to stash things away. Five letters, starts with C.",
    ],
  },
  {
    id: "daemon",
    prompt:
      "In systems, this is a background process quietly doing work out of sight. Elsewhere, it sounds like the thing haunting your codebase at 2 AM.",
    answers: ["daemon", "demon"],
    hints: [
      "It runs in the background with no one watching, doing its job out of sight.",
      "Take the word for an evil spirit, then spell it the old UNIX way. Starts with D.",
    ],
  },
  {
    id: "terminal",
    prompt:
      "This is the text interface that gives direct access to a machine. Also: where journeys begin, end, or get delayed somewhere near Jamaica.",
    answers: ["terminal"],
    hints: [
      "It is the typed window you use to talk straight to a machine.",
      "It is also the building you fly out of at an airport. Starts with T.",
    ],
  },
  {
    id: "persistence",
    prompt:
      "This is the quality that lets state survive over time in Dedalus Machines. Also: the trait required to survive the L train on a bad day.",
    answers: ["persistence", "persistent", "persist"],
    hints: [
      "It is what lets saved state outlive a restart instead of vanishing.",
      "It is also the stubborn refusal to give up. Starts with P, ends in ence.",
    ],
  },
  {
    id: "runtime",
    prompt:
      "This is the environment where code, agents, or processes actually run. Also: the length of the average Broadway show, around two and a half hours.",
    answers: ["runtime", "run time"],
    hints: [
      "It is the environment where your code actually executes.",
      "It is also how long a movie or show lasts. One word, starts with R.",
    ],
  },
  {
    id: "sleep",
    prompt:
      "On virtual machines, this is the zero-cost state where compute pauses while storage remains. In NYC, this is something that never happens.",
    answers: ["sleep"],
    hints: [
      "It is the low power state a machine drops into to save energy while keeping its memory.",
      "It is what you do every night, and what the city that never does it skips. Starts with S.",
    ],
  },
  {
    id: "session",
    prompt:
      "This is a protected container for context, state, or identity over a bounded interaction. Elsewhere, it's what a spa, Stripe, an art fair, and music producers have in common.",
    answers: ["session"],
    hints: [
      "It is a bounded window that holds your state or identity for one interaction.",
      "A spa, a recording studio, and a checkout each book one. Starts with S, seven letters.",
    ],
  },
  {
    id: "automata",
    prompt:
      "These are devices or figures designed to operate by themselves. They also describe behavior so patterned it barely seems conscious.",
    answers: ["automata", "automaton", "automatons"],
    hints: [
      "These are machines or figures built to act entirely on their own.",
      "It is the Greek plural for self operating devices. Starts with A, like automatic.",
    ],
  },
];

export const CLUE_BY_ID: ReadonlyMap<string, Clue> = new Map(CLUES.map((c) => [c.id, c]));
