import type { GemId } from "@/constants/gems";
import type { PublicPuzzle } from "@/constants/puzzles";

/** A participant rendered as a projection tile. */
export interface TileState {
  gameId: string;
  displayName: string | null;
  gem: GemId;
  gemHex: string;
  score: number;
  eliminated: boolean;
  rank: number;
}

/** Full board state. The frontend recovers from this on reload/reconnect. */
export interface ProjectionSnapshot {
  eventId: string;
  /** Public event line guests text to join; shown on the arrival board. */
  eventPhone: string;
  scene: string;
  /** The image-puzzle currently posed to the room (answers never included). */
  puzzle: PublicPuzzle;
  latestSeq: number;
  generatedAt: string;
  participants: TileState[];
  stats: {
    checkedIn: number;
    missionsCompleted: number;
    drinksActive: number;
  };
}

export const DEFAULT_SCENE = "arrival";
