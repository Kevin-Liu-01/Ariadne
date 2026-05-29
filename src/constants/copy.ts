/**
 * Guest-facing reply copy for the deterministic brain. Cinematic, concise,
 * mostly under the SMS soft limit. The agent persona/policy lives in prompts.ts.
 */

export function welcomeCopy(p: {
  gemLabel: string;
  word: string;
  gameId: string;
  missionPrompt: string;
}): string {
  return `you're in. gem: ${p.gemLabel}. word: ${p.word}. id: ${p.gameId}. first move — ${p.missionPrompt}`;
}

export function alreadyHereCopy(p: { gemLabel: string; gameId: string }): string {
  return `already threaded in. gem: ${p.gemLabel}, id: ${p.gameId}. text MISSION for your current move or order a drink anytime.`;
}

export function missionDeliverCopy(p: { title: string; prompt: string }): string {
  return `${p.title} — ${p.prompt}`;
}

export function missionCorrectCopy(p: { points: number; nextMissionPrompt?: string }): string {
  const base = `solved. +${p.points}. you're moving up the board.`;
  return p.nextMissionPrompt ? `${base} next — ${p.nextMissionPrompt}` : `${base} that's the last thread — stay close to the screen.`;
}

export function missionWrongCopy(hint?: string): string {
  return hint ? `not quite. ${hint} try again.` : "not quite. look again, then text me.";
}

export function missionPartnerInvalidCopy(): string {
  return "that game ID isn't checked in yet. find someone who's already on the board, then text me their id.";
}

export function missionNeedsInputCopy(): string {
  return "send your answer as text — for partner moves include the game IDs.";
}

export function drinkQueuedCopy(label: string): string {
  return `${label.toLowerCase()}, locked. I'll ping you when it's at the bar.`;
}

export function drinkClarifyCopy(): string {
  return "what are you drinking? text me one item from the menu and I'll send it to the bar.";
}

export function drinkReadyCopy(label: string): string {
  return `your ${label.toLowerCase()} is ready at the bar. go.`;
}

export function drinkInProgressCopy(label: string): string {
  return `${label.toLowerCase()} is being made.`;
}

export function drinkUnavailableCopy(label: string): string {
  return `${label.toLowerCase()} is off the menu tonight. pick another and I'll route it.`;
}

export function helpCopy(): string {
  return "I'm Ariadne. text a drink to order it, text your mission answer to solve it, or text MISSION for your current move. find guests by their game ID.";
}

export function notCheckedInCopy(): string {
  return "you're not threaded in yet. text JOIN (or your name) and I'll check you in.";
}

export function unknownCopy(): string {
  return "didn't catch that. text a drink, your mission answer, or HELP.";
}
