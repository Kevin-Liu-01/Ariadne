/** Scenes where quests, drinks, and song requests are allowed (once the game starts). */
export const GAMEPLAY_SCENES = new Set(["game", "runway", "finale"]);

export function gameplayAllowed(scene: string): boolean {
  return GAMEPLAY_SCENES.has(scene);
}

/** Guest-facing line for the active run-of-show scene. Gameplay opens at "game". */
export function runOfShowCopy(scene: string): string {
  switch (scene) {
    case "game":
      return `The game is live. Work through your quests at your own pace. Reply MISSION for your current quest, or DRINK, STATUS, or SONG.`;
    case "runway":
      return `The runway is live. Gameplay is open. Reply MISSION, DRINK, STATUS, or SONG.`;
    case "finale":
      return `Finale. Last call at the bar.`;
    case "arrival":
    default:
      return `The game has not started yet. You're checked in. Hang tight, I'll text you the moment it begins.`;
  }
}
