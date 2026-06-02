/**
 * Guest-facing reply copy. Polished and a little cinematic: proper grammar and
 * capitalization, with light line-break formatting so the key facts read at a
 * glance in a loud room. The wing 🪽 rides on the big moments (check-in, wins).
 * No em dashes; the agent persona/policy lives in prompts.ts.
 */

import { EVENT_NAME } from "@/constants/event";

export function checkinAskEmailCopy(): string {
  return `Welcome to Dedalus ${EVENT_NAME}. Let's thread you in. What's the email you signed up with?`;
}

export function notOnListCopy(): string {
  return "I can't find that email on tonight's list. Send it once more to be sure, or grab a door host if you think it's a mistake. I can't thread you in until it's on the list.";
}

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
  return "I'm Ariadne, your thread through the night.\n\n• Text your mission answer to solve it\n• Text MISSION for your current move\n• Text STATUS for your gem, word, ID, and score\n• Name a drink and I'll send it to the bar\n• Text a song name and I'll pass it to the DJ\n• Text HELP anytime\n\nFind other guests by their game ID.";
}

/** Announced when the scene flips on the projection board. Returns null for scenes we don't blast. */
export function sceneBroadcastCopy(sceneId: string, missionPrompt?: string | null): string | null {
  switch (sceneId) {
    case "runway":
      return "The runway is live. Eyes up, the thread is holding. 🪽";
    case "missions": {
      const move = missionPrompt ? `\n\nYour move: ${missionPrompt}` : "";
      return `Missions are live.${move}\n\nWant music? Text me a song name and I'll pass it to the DJ.`;
    }
    case "puzzle":
      return "Look at the big screen. Decode the image and text me what it is: a myth, object, place, or source.";
    case "elimination":
      return "The final push. Stay sharp, find your partners, and don't fade out.";
    case "finale":
      return "We've reached the finale. Last call at the bar. Take a bow. 🪽";
    default:
      return null;
  }
}

export function progressNudgeCopy(p: { engaged: boolean; score: number; missionPrompt: string | null }): string {
  const move = p.missionPrompt ? ` Your move: ${p.missionPrompt}` : " Stay close to the screen.";
  return p.engaged
    ? `You're at ${p.score} points.${move}`
    : `You're threaded in but haven't made a move yet.${move}`;
}

export function pickupCheckCopy(label: string): string {
  return `Did you grab your ${label} from the bar? Text yes once you have it.`;
}

export function nameNudgeCopy(): string {
  return "Still with me? Tell me your name and I'll thread you into the game.";
}

export function songQueuedCopy(text: string): string {
  return `Sent "${text}" to the DJ. They'll give it a thumbs up or down shortly.`;
}

export function songDecisionCopy(text: string, accepted: boolean): string {
  return accepted
    ? `Your pick "${text}" made the DJ's queue. 🪽`
    : `The DJ passed on "${text}" this time. Send me another and I'll try again.`;
}

export function pickupConfirmedCopy(label: string): string {
  return `Enjoy your ${label}. 🪽`;
}

export function notCheckedInCopy(): string {
  return "You're not threaded in yet. Text JOIN (or just tell me your name) and I'll check you in.";
}

export function unknownCopy(): string {
  return "I didn't quite catch that. Text a drink, your mission answer, or HELP.";
}
