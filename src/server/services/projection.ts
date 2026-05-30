import { GEMS } from "@/constants/gems";
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

  async snapshot(): Promise<ProjectionSnapshot> {
    const [participants, scene, latestSeq, missionsCompleted, active] = await Promise.all([
      this.repos.participants.listByEvent(this.eventId),
      this.scene(),
      this.repos.projection.latestSeq(this.eventId),
      this.repos.participantMissions.countCompleted(this.eventId),
      this.repos.drinkOrders.listActive(this.eventId),
    ]);
    const tiles: TileState[] = participants.map((p, index) => ({
      gameId: p.gameId,
      displayName: p.displayName,
      gem: p.gem,
      gemHex: GEMS[p.gem].hex,
      score: p.score,
      eliminated: p.eliminated,
      rank: index + 1,
    }));
    return {
      eventId: this.eventId,
      scene,
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
