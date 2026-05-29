import type { GemId } from "@/constants/gems";

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
  scene: string;
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
