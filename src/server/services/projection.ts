import { DEFAULT_HOME_MODE, type HomeMode } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { DEFAULT_PUZZLE_ID, PUZZLE_BY_ID, puzzleById, toPublicPuzzle } from "@/constants/puzzles";
import { env } from "@/lib/env";
import { now } from "@/lib/time";
import { DEFAULT_SCENE, type ProjectionSnapshot, type TileState } from "@/domain/projection";
import type { ProjectionEvent, ProjectionEventType } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";

/**
 * Owns the append-only projection stream and the recoverable board snapshot.
 * The board polls `snapshot()` then `eventsSince()`; Postgres is the single
 * source of truth, so a reconnecting board always recovers exact state.
 */
export class ProjectionService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
  ) {}

  /** Append an event to the durable log. The board picks it up on its next poll. */
  async emit(type: ProjectionEventType, data: Record<string, unknown>): Promise<ProjectionEvent> {
    return this.repos.projection.append(this.eventId, type, data);
  }

  /** Current scene, derived from the last operator scene change. */
  async scene(): Promise<string> {
    const last = await this.repos.projection.lastOfType(this.eventId, "scene.changed");
    const scene = last?.data.scene;
    return typeof scene === "string" ? scene : DEFAULT_SCENE;
  }

  /** Current image-puzzle id, derived from the last operator puzzle change. */
  async currentPuzzleId(): Promise<string> {
    const last = await this.repos.projection.lastOfType(this.eventId, "puzzle.changed");
    const id = last?.data.puzzleId;
    return typeof id === "string" && PUZZLE_BY_ID.has(id) ? id : DEFAULT_PUZZLE_ID;
  }

  /** Home-page check-in surface, derived from the last operator toggle. Defaults to iMessage. */
  async homeMode(): Promise<HomeMode> {
    const last = await this.repos.projection.lastOfType(this.eventId, "home_mode.changed");
    return last?.data.mode === "play" ? "play" : DEFAULT_HOME_MODE;
  }

  async snapshot(): Promise<ProjectionSnapshot> {
    const [participants, scene, homeMode, puzzleId, latestSeq, missionsCompleted, active, questCounts] =
      await Promise.all([
        this.repos.participants.listByEvent(this.eventId),
        this.scene(),
        this.homeMode(),
        this.currentPuzzleId(),
        this.repos.projection.latestSeq(this.eventId),
        this.repos.participantMissions.countCompleted(this.eventId),
        this.repos.drinkOrders.listActive(this.eventId),
        this.repos.participantMissions.completedCountsByParticipant(this.eventId),
      ]);
    const puzzle = toPublicPuzzle(puzzleById(puzzleId));
    const tiles: TileState[] = participants.map((p, index) => ({
      gameId: p.gameId,
      displayName: p.displayName,
      gem: p.gem,
      gemHex: GEMS[p.gem].hex,
      score: p.score,
      questsDone: questCounts.get(p.id) ?? 0,
      eliminated: p.eliminated,
      rank: index + 1,
    }));
    return {
      eventId: this.eventId,
      eventPhone: env.agentphone.phoneNumber,
      scene,
      homeMode,
      puzzle,
      latestSeq,
      generatedAt: now(),
      participants: tiles,
      stats: {
        checkedIn: participants.length,
        missionsCompleted,
        drinksActive: active.length,
      },
    };
  }

  async eventsSince(sinceSeq: number): Promise<ProjectionEvent[]> {
    return this.repos.projection.listSince(this.eventId, sinceSeq);
  }
}
