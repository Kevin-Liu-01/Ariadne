/**
 * Research-clue riddles for the labyrinth mission. Each riddle resolves to a
 * single systems term that hides a second, everyday meaning; `answers` lists the
 * accepted spellings/aliases. One clue is assigned per guest deterministically
 * (see `clueForParticipant` in domain/mission-parse). Product owns this content.
 */

export interface Clue {
  readonly id: string;
  readonly prompt: string;
  readonly answers: readonly string[];
}

export const CLUES: readonly Clue[] = [
  {
    id: "thread",
    prompt:
      "In technical terms, this lightweight unit of execution shares a process; in myth, Ariadne used one to escape the labyrinth.",
    answers: ["thread"],
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
    id: "boot",
    prompt:
      "This is what happens when a machine starts up. According to Flo Rida, one of these also comes with fur.",
    answers: ["boot", "boots"],
  },
  {
    id: "session",
    prompt:
      "This is a protected container for context, state, or identity over a bounded interaction. Elsewhere, it's what a spa, Stripe, an art fair, and music producers have in common.",
    answers: ["session"],
  },
  {
    id: "s3",
    prompt: "Object storage often used for files, assets, and backups. Also, a 2026 Audi.",
    answers: ["s3"],
  },
  {
    id: "automata",
    prompt:
      "These are devices or figures designed to operate by themselves. They also describe behavior so patterned it barely seems conscious.",
    answers: ["automata", "automaton", "automatons"],
  },
];

export const CLUE_BY_ID: ReadonlyMap<string, Clue> = new Map(CLUES.map((c) => [c.id, c]));
