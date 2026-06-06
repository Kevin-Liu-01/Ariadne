/** Scenes where quests are open (once the game starts), including the mid-game
 *  "visuals" break and the "finale". The pre-game cinematic scenes (arrival, opening,
 *  and the runway show that opens the night) keep quests locked. Drinks and song
 *  requests are NOT gated by this: the bar and DJ stay open in every scene once a
 *  guest is checked in. */
export const GAMEPLAY_SCENES = new Set(["game", "visuals", "finale"]);

export function gameplayAllowed(scene: string): boolean {
  return GAMEPLAY_SCENES.has(scene);
}
