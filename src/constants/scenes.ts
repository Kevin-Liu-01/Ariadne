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

// Run-of-show order: doors, then one game board for the whole night (guests work
// color -> word -> riddle at their own pace; the operator never switches quest
// boards), then winners, then the runway show closes the night.
export const SCENES = [
  {
    id: "arrival",
    note: "Doors open. Guests check in by text (name, then list email) and wait. The board shows the join line and who has checked in. Gameplay opens when you pick 'game'.",
    headline: "Doors are open",
    tagline: "Check in by text. The game begins when the room is ready.",
    accent: "aquamarine",
  },
  {
    id: "opening",
    note: "The Run(way)time opening: a cinematic shader title card before the game. Use it to gather the room and hype the night; no tiles, no texts. Pick 'game' to start play.",
    headline: "Run(way)time",
    tagline: "Find your place. The game begins in a moment.",
    accent: "helio",
  },
  {
    id: "game",
    note: "The game is live: one board for the whole night. Every guest, the quest they're on, points, plus the color/word/riddle panels together. Guests progress color -> word -> riddle at their own pace.",
    headline: "The game is live",
    tagline: "Color, word, riddle. Solve at your own pace.",
    accent: "helio",
  },
  {
    id: "finale",
    note: "Winners crowned. Board raises a podium for the top three and celebrates the night.",
    headline: "Winners of the night",
    tagline: "Take a bow.",
    accent: "garnet",
  },
  {
    id: "runway",
    note: "The runway show closes the night. The board goes calm and cinematic while the room watches.",
    headline: "The runway is live",
    tagline: "Eyes up. The room is yours.",
    accent: "cloud",
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
