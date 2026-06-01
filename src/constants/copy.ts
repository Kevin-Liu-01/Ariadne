/**
 * Guest-facing reply copy. Polished and a little cinematic: proper grammar and
 * capitalization, with light line-break formatting so the key facts read at a
 * glance in a loud room. The wing 🪽 rides on the big moments (check-in, wins).
 * No em dashes; the agent persona/policy lives in prompts.ts.
 */

export function welcomeCopy(p: {
  name?: string | null;
  gemLabel: string;
  word: string;
  gameId: string;
  missionPrompt: string;
}): string {
  const lead = p.name ? `Welcome, ${p.name}. You're threaded in. 🪽` : `You're threaded in. 🪽`;
  return `${lead}\n\nGem: ${p.gemLabel}\nSecret word: ${p.word}\nGame ID: ${p.gameId}\n\nYour first move: ${p.missionPrompt}`;
}

export function askNameCopy(): string {
  return "Welcome to the maze. What should I call you? First name is fine.";
}

export function badNameCopy(): string {
  return "I can't put that on the board. What should I call you? First name is fine.";
}

export function alreadyHereCopy(p: { name?: string | null; gemLabel: string; gameId: string }): string {
  const who = p.name ? `${p.name}, you're` : "You're";
  return `${who} already threaded in. 🪽\n\nGem: ${p.gemLabel} · Game ID: ${p.gameId}\n\nText MISSION for your current move, or name a drink and I'll send it to the bar.`;
}

export function missionDeliverCopy(p: { title: string; prompt: string }): string {
  return `${p.title}\n${p.prompt}`;
}

export function missionCorrectCopy(p: { points: number; nextMissionPrompt?: string }): string {
  const base = `Solved! +${p.points} points. 🪽 You're climbing the board.`;
  return p.nextMissionPrompt
    ? `${base}\n\nNext: ${p.nextMissionPrompt}`
    : `${base}\n\nThat was the last thread. Stay close to the screen.`;
}

export function missionWrongCopy(hint?: string): string {
  return hint ? `Not quite. ${hint}\n\nTry again.` : "Not quite. Look again, then text me your answer.";
}

export function missionPartnerInvalidCopy(): string {
  return "That game ID isn't on the board yet. Find someone who's already checked in, then send me their ID.";
}

export function missionNeedsInputCopy(): string {
  return "Send your answer as text. For partner moves, include the game IDs.";
}

export function drinkQueuedCopy(label: string): string {
  return `${label}, locked in. I'll ping you the moment it's ready at the bar.`;
}

export function drinkClarifyCopy(): string {
  return "What are you drinking? Text me one item from the menu and I'll send it to the bar.";
}

export function drinkReadyCopy(label: string): string {
  return `Your ${label} is ready at the bar. Go get it. 🪽`;
}

export function drinkInProgressCopy(label: string): string {
  return `Your ${label} is being made now.`;
}

export function drinkUnavailableCopy(label: string): string {
  return `${label} is off the menu tonight. Pick another and I'll route it.`;
}

export function helpCopy(): string {
  return "I'm Ariadne, your thread through the night.\n\n• Text your mission answer to solve it\n• Text MISSION for your current move\n• Name a drink and I'll send it to the bar\n\nFind other guests by their game ID.";
}

export function notCheckedInCopy(): string {
  return "You're not threaded in yet. Text JOIN (or just tell me your name) and I'll check you in.";
}

export function unknownCopy(): string {
  return "I didn't quite catch that. Text a drink, your mission answer, or HELP.";
}
