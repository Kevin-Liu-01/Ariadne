/** Scenes where guests appear as VM/container tiles on the projection board. */
const GAMEPLAY_SCENES = new Set(["missions", "runway", "puzzle", "elimination"]);

export function projectionGameplayActive(scene: string): boolean {
  return GAMEPLAY_SCENES.has(scene);
}
