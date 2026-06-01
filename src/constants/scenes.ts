/**
 * Run-of-show scenes for the projection board, in the order a night moves through
 * them. The operator can jump to any scene; `nextScene` powers the "recommended
 * next" hint in the run-of-show control.
 */

export interface Scene {
  readonly id: string;
  readonly note: string;
}

export const SCENES = [
  { id: "arrival", note: "doors open, guests checking in" },
  { id: "runway", note: "show is on, tiles idle" },
  { id: "missions", note: "missions live, points moving" },
  { id: "puzzle", note: "decode image on the big screen" },
  { id: "elimination", note: "fades and final push" },
  { id: "finale", note: "winners, last call" },
] as const satisfies readonly Scene[];

export type SceneId = (typeof SCENES)[number]["id"];

export const SCENE_IDS: readonly string[] = SCENES.map((s) => s.id);

export const SCENE_BY_ID: ReadonlyMap<string, Scene> = new Map(SCENES.map((s) => [s.id, s]));

/** The scene the night usually moves to next; wraps at the end. */
export function nextScene(current: string): string {
  const at = SCENE_IDS.indexOf(current);
  return SCENE_IDS[(at + 1) % SCENE_IDS.length] ?? SCENE_IDS[0];
}
