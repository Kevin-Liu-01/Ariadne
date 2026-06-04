import { EVENT_NAME } from "@/constants/event";

/** Scenes where quests, drinks, and song requests are allowed (after venue code). */
export const GAMEPLAY_SCENES = new Set(["game", "runway", "finale"]);

export function gameplayAllowed(scene: string): boolean {
  return GAMEPLAY_SCENES.has(scene);
}

/** Guest-facing line for the active run-of-show scene. */
export function runOfShowCopy(scene: string, gameUnlocked: boolean): string {
  if (!gameUnlocked) {
    return `The show has not started for you yet. Save my contact, then reply with the venue code you see inside ${EVENT_NAME}. If you ask where the code is: you will see it as soon as you enter the venue.`;
  }
  switch (scene) {
    case "arrival":
      return `The show has not started yet. You are on the list. Gameplay opens when staff advance the run of show and you have entered the venue code.`;
    case "game":
      return `The game is live. Work through your quests at your own pace. Reply MISSION for your current quest, or DRINK, STATUS, or SONG.`;
    case "runway":
      return `The runway is live. Gameplay is open. Reply MISSION, DRINK, STATUS, or SONG.`;
    case "finale":
      return `Finale. Last call at the bar.`;
    default:
      return `Run of show: ${scene}. Gameplay follows the screen in the room.`;
  }
}

export function secretCodePromptCopy(): string {
  return `Save my contact from the card above, then reply with the venue code printed inside ${EVENT_NAME}. You will see the code as soon as you enter the venue.`;
}

export function secretCodeAcceptedCopy(): string {
  return `Code accepted. The game will open when the run of show reaches gameplay. Reply HELP for commands.`;
}

export function secretCodeWrongCopy(): string {
  return `That code does not match. Check the sign inside the venue and try again.`;
}
