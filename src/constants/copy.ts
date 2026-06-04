/**
 * Guest-facing reply copy. Concise and structured: proper grammar, minimal
 * words, and labeled line breaks so the key facts read at a glance in a loud
 * room. Every message points the guest at their next move. The wing 🪽 rides on
 * the two real wins (check-in, solved mission) and nowhere else. No em dashes;
 * the agent persona/policy lives in prompts.ts.
 */

import { menuSummary } from "@/constants/drinks";
import { EVENT_NAME } from "@/constants/event";

/** Message 1 of check-in: ask the guest's first name. */
export function checkinAskNameCopy(): string {
  return `Welcome to Dedalus ${EVENT_NAME}. To start, what's your first name?`;
}

/** Message 2 of check-in: now ask for the waitlist email, by name. */
export function askEmailAfterNameCopy(name: string): string {
  return `Thanks, ${name}. Now reply with the email you signed up with.`;
}

export function checkinAskEmailCopy(): string {
  return `Welcome to Dedalus ${EVENT_NAME}. To check you in, reply with the email you signed up with.`;
}

export function notOnListCopy(): string {
  return "I can't find that email on tonight's list. Reply with it again to confirm, or find a door host. I can't check you in until it's listed.";
}

export function welcomeCopy(p: {
  name?: string | null;
  gemLabel: string;
  word: string;
  gameId: string;
  missionPrompt: string;
}): string {
  const lead = p.name ? `Welcome, ${p.name}. You're checked in. 🪽` : `You're checked in. 🪽`;
  return `${lead}\n\nGem: ${p.gemLabel}\nSecret word: ${p.word}\nGame ID: ${p.gameId}\n\nFirst mission: ${p.missionPrompt}`;
}

export function askNameCopy(): string {
  return "Before I check you in, what's your first name?";
}

export function badNameCopy(): string {
  return "I can't put that on the board. What's your first name?";
}

export function alreadyHereCopy(p: { name?: string | null; gemLabel: string; gameId: string }): string {
  const who = p.name ? `${p.name}, you're` : "You're";
  return `${who} already checked in. 🪽\n\nGem: ${p.gemLabel} · Game ID: ${p.gameId}\n\nReply MISSION for your current task, or name a drink and I'll send it to the bar.`;
}

export function missionDeliverCopy(p: { title: string; prompt: string }): string {
  return `${p.title}\n${p.prompt}`;
}

/** STATUS reply: identity, score, quest progress, and the next quest. */
export function statusCopy(p: {
  gemLabel: string;
  gameId: string;
  score: number;
  questsDone: number;
  questsTotal: number;
  currentQuest: string | null;
}): string {
  const head = `Gem: ${p.gemLabel} · Game ID: ${p.gameId} · ${p.score} pts\nQuests: ${p.questsDone}/${p.questsTotal} complete`;
  return p.currentQuest
    ? `${head}\n\n${p.currentQuest}`
    : `${head}\n\nAll three quests complete. Stay near the screen.`;
}

export function missionCorrectCopy(p: { points: number; nextMissionPrompt?: string }): string {
  const base = `Correct. +${p.points} points. 🪽`;
  return p.nextMissionPrompt
    ? `${base}\n\nNext: ${p.nextMissionPrompt}`
    : `${base}\n\nThat was the last mission. Stay near the screen.`;
}

export function missionWrongCopy(hint?: string): string {
  return hint ? `Incorrect. ${hint}\n\nTry again.` : "Incorrect. Take another look, then reply with your answer.";
}

export function missionPartnerInvalidCopy(): string {
  return "That game ID isn't on the board yet. Find a checked-in guest and reply with their ID.";
}

export function missionDuplicatePartnerCopy(): string {
  return "You already talked to this person, go talk to someone else.";
}

export function riddleProgressCopy(p: { solved: number; total: number; nextRiddlePrompt: string }): string {
  const head = `Riddle solved. ${p.solved} of ${p.total}.`;
  return p.nextRiddlePrompt ? `${head}\n\nNext:\n${p.nextRiddlePrompt}` : head;
}

export function allQuestsDoneCopy(): string {
  return "You've completed all three quests. Stay near the screen.";
}

export function missionNeedsInputCopy(): string {
  return "Reply with your answer as text. For partner tasks, include the game IDs.";
}

export function drinkQueuedCopy(label: string): string {
  return `${label}: order received. I'll let you know when it's ready at the bar.`;
}

export function drinkClarifyCopy(): string {
  return "Which drink? Reply with one item from the menu and I'll send it to the bar.";
}

/** Reply to the bare DRINK command: the menu plus the voucher rule. */
export function drinkMenuCopy(): string {
  return `Tonight's bar:\n\n${menuSummary()}\n\nReply with one item and I'll send it. One free cocktail per guest; beer, wine, and soda are unlimited.`;
}

/** Reply to the bare SONG command: how to format a request. */
export function songPromptCopy(): string {
  return 'Reply SONG and the track, for example "SONG One More Time by Daft Punk", and I\'ll send it to the DJ.';
}

export function drinkReadyCopy(label: string): string {
  return `Your ${label} is ready at the bar.`;
}

export function drinkInProgressCopy(label: string): string {
  return `Your ${label} is being made now.`;
}

export function drinkUnavailableCopy(label: string): string {
  return `${label} isn't available tonight. Pick another and I'll route it.`;
}

export function drinkVoucherUsedCopy(): string {
  return "You've already used your one free cocktail. Beer, wine, and soda are still unlimited at the bar. Name one and I'll send it.";
}

export function cocktailsOutCopy(): string {
  return "Cocktails are sold out for the night. Beer, wine, and soda are still free and unlimited. Name one and I'll send it.";
}

/** Auto-message when a ready order is deleted for non-pickup. Sent exactly once. */
export function drinkExpiredCopy(wasCocktail: boolean): string {
  return wasCocktail
    ? "Your order expired. You used your special cocktail voucher, but there is still wine, beer, and soda available for free at the bar."
    : "Your order expired. There is still wine, beer, and soda available for free at the bar. Name one and I'll send it.";
}

export function helpCopy(): string {
  return "I'm Ariadne, your agent for the night. You can:\n\n• Reply with your mission answer to solve it\n• MISSION: your current task\n• STATUS: your gem, word, ID, and score\n• DRINK: the bar menu (one free cocktail; beer, wine, soda unlimited)\n• SONG [name]: request a track from the DJ\n• HELP: this list\n\nFind other guests by their game ID.";
}

/** Announced when the scene flips on the projection board. Returns null for scenes we don't blast. */
export function sceneBroadcastCopy(sceneId: string, missionPrompt?: string | null): string | null {
  switch (sceneId) {
    case "runway":
      return "The runway is live. Eyes on the main screen.";
    case "missions": {
      const move = missionPrompt ? `\n\nYour move: ${missionPrompt}` : "";
      return `Missions are live.${move}\n\nWant music? Reply with a song name and I'll send it to the DJ.`;
    }
    case "puzzle":
      return "Look at the main screen.";
    case "elimination":
      return "Final round. Find your partners and stay in the game.";
    case "finale":
      return "We've reached the finale. Last call at the bar.";
    default:
      return null;
  }
}

export function progressNudgeCopy(p: { engaged: boolean; score: number; missionPrompt: string | null }): string {
  const move = p.missionPrompt ? ` Your move: ${p.missionPrompt}` : " Stay near the screen.";
  const lead = p.engaged
    ? `You're at ${p.score} points.${move}`
    : `You're checked in but haven't made a move yet.${move}`;
  return `${lead} Text HELP anytime.`;
}

export function pickupCheckCopy(label: string): string {
  return `Did you grab your ${label} from the bar? Reply yes once you have it.`;
}

export function nameNudgeCopy(): string {
  return "Still there? Reply with the email you signed up with and I'll check you in. Text HELP anytime.";
}

export function songQueuedCopy(text: string): string {
  return `Sent "${text}" to the DJ.`;
}

export function songDecisionCopy(text: string, accepted: boolean): string {
  return accepted
    ? `Your pick "${text}" is in the DJ's queue.`
    : `The DJ passed on "${text}". Reply with another and I'll try again.`;
}

export function pickupConfirmedCopy(label: string): string {
  return `Enjoy your ${label}.`;
}

export function notCheckedInCopy(): string {
  return "You're not checked in yet. Reply with the email you signed up with and I'll check you in.";
}

export function unknownCopy(): string {
  return "I didn't catch that. Reply with a drink, your mission answer, or HELP.";
}
