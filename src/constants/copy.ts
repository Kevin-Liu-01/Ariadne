/**
 * Guest-facing reply copy. Concise, structured, CAPS commands, stylized bullets.
 * Wing 🪽 only on check-in and solved mission. No em dashes.
 */

import { menuSummary } from "@/constants/drinks";
import { EVENT_NAME } from "@/constants/event";
import { BULLET, CMD, commandList } from "@/constants/format";
import type { GemId } from "@/constants/gems";
import { GEMS } from "@/constants/gems";
import { GEM_WHEEL_HUE } from "@/domain/gem-wheel";

export function gameStateBlock(p: {
  name?: string | null;
  gemLabel: string;
  word: string;
  gameId: string;
  score?: number;
}): string {
  const nameLine = p.name ? `Name: ${p.name}\n` : "";
  const scoreLine = p.score !== undefined ? `Score: ${p.score} pts\n` : "";
  return `${nameLine}Color: ${p.gemLabel}\nSecret word: ${p.word}\nGame ID: ${p.gameId}\n${scoreLine}`.trimEnd();
}

export function commandsIntroCopy(): string {
  return commandList([
    `Reply with your quest answer to solve it`,
    `${CMD.mission}: current quest`,
    `${CMD.status}: color, word, ID, score, quests`,
    `${CMD.drink}: bar menu (one cocktail voucher; beer, wine, non-alcoholic unlimited)`,
    `${CMD.song} [track]: DJ request`,
    `${CMD.help}: this list`,
  ]);
}

export function checkinAskNameCopy(): string {
  return `Welcome to Dedalus ${EVENT_NAME}.\n\nWhat is your first name?`;
}

export function askEmailAfterNameCopy(name: string): string {
  return `Thanks, ${name}.\n\nReply with the email you signed up with.`;
}

export function checkinAskEmailCopy(): string {
  return `Welcome to Dedalus ${EVENT_NAME}.\n\nReply with the email you signed up with.`;
}

export function notOnListCopy(): string {
  return "That email is not on tonight's list. Reply with it again to confirm, or see a door host.";
}

export function welcomeCopy(p: {
  name: string;
  gemLabel: string;
  word: string;
  gameId: string;
  missionPrompt: string;
}): string {
  return `${p.name}, you're checked in. 🪽\n\n${gameStateBlock(p)}\n\nFirst quest:\n${p.missionPrompt}`;
}

export function checkedInCopy(p: {
  name: string;
  gemLabel: string;
  word: string;
  gameId: string;
}): string {
  return `${p.name}, you're checked in. 🪽\n\n${gameStateBlock(p)}\n\nThe game starts soon. I'll text you the moment it begins. Reply HELP anytime.`;
}

export function askNameCopy(): string {
  return "What is your first name?";
}

export function badNameCopy(): string {
  return "I can't use that name. What is your first name?";
}

export function alreadyHereCopy(p: {
  name?: string | null;
  gemLabel: string;
  word: string;
  gameId: string;
  score: number;
}): string {
  const who = p.name ?? "You";
  return `${who}, you're already checked in. 🪽\n\n${gameStateBlock(p)}\n\nReply ${CMD.mission} or ${CMD.status}.`;
}

export function missionDeliverCopy(p: { title: string; prompt: string }): string {
  return `${p.title}\n\n${p.prompt}`;
}

export function statusCopy(p: {
  name?: string | null;
  gemLabel: string;
  word: string;
  gameId: string;
  score: number;
  questsDone: number;
  questsTotal: number;
  currentQuest: string | null;
  locked?: boolean;
}): string {
  const head = `${gameStateBlock(p)}\n\nQuests: ${p.questsDone}/${p.questsTotal} complete`;
  if (p.locked) return `${head}\n\nThe game has not started yet. Hang tight, I'll text you when it begins.`;
  return p.currentQuest ? `${head}\n\n${p.currentQuest}` : `${head}\n\nAll three quests complete. Stay near the screen.`;
}

export function missionCorrectCopy(p: { points: number; nextMissionPrompt?: string }): string {
  const base = `Correct. +${p.points} points. 🪽`;
  return p.nextMissionPrompt
    ? `${base}\n\nNext:\n${p.nextMissionPrompt}`
    : `${base}\n\nAll quests done. Stay near the screen.`;
}

export function missionWrongCopy(hint?: string): string {
  return hint ? `Incorrect.\n\n${hint}\n\nTry again.` : "Incorrect. Try again.";
}

export function missionPartnerInvalidCopy(): string {
  return "That game ID is not on the board. Find a checked-in guest and include their ID.";
}

export function missionDuplicatePartnerCopy(): string {
  return "You already talked to this person. Go talk to someone else.";
}

export function riddleProgressCopy(p: { solved: number; total: number; nextRiddlePrompt: string }): string {
  const head = `Riddle solved. ${p.solved} of ${p.total}.`;
  return p.nextRiddlePrompt ? `${head}\n\nNext:\n${p.nextRiddlePrompt}` : head;
}

export function allQuestsDoneCopy(): string {
  return "All three quests complete. Stay near the screen.";
}

export function missionNeedsInputCopy(): string {
  return "Reply with your answer. For partner quests, include game IDs.";
}

export function drinkQueuedCopy(label: string): string {
  return `${label}: order received.\n\nReminder: one special cocktail voucher per guest. Beer, wine, and non-alcoholic drinks are unlimited at the bar.\n\nI'll text when it's ready.`;
}

export function drinkClarifyCopy(): string {
  return `Which drink? One item from the menu.\n\n${menuSummary()}`;
}

export function drinkMenuCopy(): string {
  return `Tonight's bar:\n\n${menuSummary()}\n\nOne special cocktail voucher per guest. Beer, wine, and non-alcoholic drinks are unlimited.\n\nReply with one item.`;
}

export function songPromptCopy(): string {
  return `Reply ${CMD.song} and the track, for example "${CMD.song} One More Time by Daft Punk".`;
}

export function drinkReadyCopy(label: string): string {
  return `Your ${label} is ready at the bar.`;
}

export function drinkInProgressCopy(label: string): string {
  return `Your ${label} is being made now.`;
}

export function drinkUnavailableCopy(label: string): string {
  return `${label} is not on the menu tonight. Pick one item from the menu.`;
}

export function drinkVoucherUsedCopy(): string {
  return "You already used your one cocktail voucher. Beer, wine, and non-alcoholic drinks are still unlimited. Name one item.";
}

export function cocktailsOutCopy(): string {
  return "Cocktails are sold out for the night. Beer, wine, and non-alcoholic drinks are still unlimited.";
}

export function drinkInvalidQuantityCopy(): string {
  return "One drink per message. Reply with a single item from the menu.";
}

export function drinkExpiredCopy(wasCocktail: boolean): string {
  return wasCocktail
    ? "Your order expired. You used your cocktail voucher. Beer, wine, and non-alcoholic drinks are still free at the bar."
    : "Your order expired. Beer, wine, and non-alcoholic drinks are still free at the bar.";
}

export function helpCopy(): string {
  return `I'm Ariadne for ${EVENT_NAME}.\n\nCommands:\n\n${commandsIntroCopy()}\n\nFind other guests by game ID.`;
}

export function sceneBroadcastCopy(sceneId: string, missionPrompt?: string | null): string | null {
  const move = missionPrompt ? `\n\nYour move:\n${missionPrompt}` : "";
  switch (sceneId) {
    case "game":
      return `The game is live. Work through color, word, and riddle at your own pace.${move}`;
    case "runway":
      return "The runway is live. Eyes on the main screen.";
    case "finale":
      return "Finale. Last call at the bar.";
    default:
      return null;
  }
}

export function progressNudgeCopy(p: { engaged: boolean; score: number; missionPrompt: string | null }): string {
  const move = p.missionPrompt ? `\n\nYour move:\n${p.missionPrompt}` : "\n\nStay near the screen.";
  const lead = p.engaged ? `Score: ${p.score} pts.${move}` : `You are checked in but have not scored yet.${move}`;
  return `${lead}\n\nReply ${CMD.help} anytime.`;
}

export function pickupCheckCopy(label: string): string {
  return `Did you pick up your ${label}? Reply yes once you have it.`;
}

export function nameNudgeCopy(): string {
  return `Still there? Reply with the email you signed up with.\n\nReply ${CMD.help} anytime.`;
}

export function songQueuedCopy(text: string): string {
  return `Sent "${text}" to the DJ.`;
}

export function songDecisionCopy(text: string, accepted: boolean): string {
  return accepted ? `Your pick "${text}" is in the DJ queue.` : `The DJ passed on "${text}".`;
}

export function pickupConfirmedCopy(label: string): string {
  return `Enjoy your ${label}.`;
}

export function notCheckedInCopy(): string {
  return `You are not checked in yet.\n\nReply with the email you signed up with.`;
}

export function unknownCopy(): string {
  return `I did not catch that.\n\nReply a quest answer, ${CMD.drink}, or ${CMD.help}.`;
}

export function gameLockedCopy(): string {
  return `The game has not started yet.\n\nHang tight, I'll text you the moment it begins.`;
}

export function pauseTextsCopy(): string {
  return "Understood. I will pause texts for now. Reply anytime when you want to resume the game.";
}

export function hostRequestOfferCopy(): string {
  return "Would you like to submit a request to a host? Reply YES and describe the issue in your next message.";
}

export function hostRequestNeedIssueCopy(): string {
  return "Reply with what you need from a host in one message. I will summarize it for the dashboard.";
}

export function hostRequestSubmittedCopy(): string {
  return "Your request is on the host dashboard. They will follow up when they can.";
}

export function hostRequestDeclinedCopy(): string {
  return "No problem. Reply HELP if you need commands.";
}

/** Shown with the first vCard attachment. */
export function contactCardIntroCopy(): string {
  return `Save my contact from the card above so my texts always reach you.\n\nThe game starts soon, keep an eye on this thread.`;
}

/** Wraps an operator's typed announcement so guests see it as a venue notice, not a reply. */
export function announcementCopy(body: string): string {
  return `${EVENT_NAME} announcement:\n\n${body}`;
}

/** Gem name with its wheel hue, e.g. "Citrine (yellow)", so guests can play the color quest. */
export function gemColorLabel(gem: GemId): string {
  return `${GEMS[gem].label} (${GEM_WHEEL_HUE[gem]})`;
}
