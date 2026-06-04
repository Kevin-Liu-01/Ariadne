/**
 * Run-of-show scenes. Each scene is a distinct projection-board layout, ordered
 * the way a night moves through them. The operator jumps between them; `nextScene`
 * powers the "recommended next" hint, and the board reads `headline`, `tagline`,
 * and `accent` to render a unique stage for each one.
 */

export type SceneAccent = "helio" | "topaz" | "peridot" | "garnet" | "aquamarine" | "cloud";

export interface Scene {
  readonly id: string;
  /** Operator-facing description of what this stage does. */
  readonly note: string;
  /** Big board headline for the stage. */
  readonly headline: string;
  /** Board sub-line under the headline. */
  readonly tagline: string;
  /** Accent color the stage paints with. */
  readonly accent: SceneAccent;
}

export const SCENES = [
  {
    id: "arrival",
    note: "Doors open. Guests text in, get their gem, secret word, and first quest. Board shows the join line and who has checked in.",
    headline: "Doors are open",
    tagline: "Text the line to step into the labyrinth.",
    accent: "aquamarine",
  },
  {
    id: "runway",
    note: "House lights down, the show is on. Scores hold steady while the room watches; the board goes calm and cinematic.",
    headline: "The runway is live",
    tagline: "Eyes up. The thread is holding.",
    accent: "cloud",
  },
  {
    id: "color",
    note: "Color Quest. The board shows the six gems and the two triangles; guests find three colors that form one. Leaderboard on the rail.",
    headline: "Find your color triangle",
    tagline: "Three hues that form a triangle: all primary or all secondary.",
    accent: "helio",
  },
  {
    id: "word",
    note: "Word Quest. The board shows the valid two-word combos; guests find the guest whose secret word completes a phrase with theirs.",
    headline: "Complete the phrase",
    tagline: "Find the guest whose word finishes yours.",
    accent: "peridot",
  },
  {
    id: "riddle",
    note: "Riddle round. The board shows the riddles (also texted to each guest). Guests text one-word answers. Points reward speed.",
    headline: "Riddles of the labyrinth",
    tagline: "Solve them. Answer by text.",
    accent: "topaz",
  },
  {
    id: "finale",
    note: "Winners crowned, last call at the bar. Board raises a podium for the top three and celebrates the night.",
    headline: "Winners of the night",
    tagline: "Last call. Take a bow.",
    accent: "garnet",
  },
] as const satisfies readonly Scene[];

export type SceneId = (typeof SCENES)[number]["id"];

export const SCENE_IDS: readonly string[] = SCENES.map((s) => s.id);

export const SCENE_BY_ID: ReadonlyMap<string, Scene> = new Map(SCENES.map((s) => [s.id, s]));

export const DEFAULT_SCENE_META: Scene = SCENES[0];

/** Look up a scene's board metadata, falling back to arrival for unknown ids. */
export function sceneMeta(id: string): Scene {
  return SCENE_BY_ID.get(id) ?? DEFAULT_SCENE_META;
}

/** The scene the night usually moves to next; wraps at the end. */
export function nextScene(current: string): string {
  const at = SCENE_IDS.indexOf(current);
  return SCENE_IDS[(at + 1) % SCENE_IDS.length] ?? SCENE_IDS[0];
}
