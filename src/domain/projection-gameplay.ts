/** Scenes where guests appear as VM/container tiles on the projection board. */
const GAMEPLAY_SCENES = new Set(["game", "runway", "finale"]);

export function projectionGameplayActive(scene: string): boolean {
  return GAMEPLAY_SCENES.has(scene);
}
