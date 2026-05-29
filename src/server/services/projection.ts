import { GEMS } from "@/constants/gems";
import { now } from "@/lib/time";
import { DEFAULT_SCENE, type ProjectionSnapshot, type TileState } from "@/domain/projection";
import type { ProjectionEvent, ProjectionEventType } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { EventBus } from "@/server/services/event-bus";

/** Owns the append-only projection stream and the recoverable board snapshot. */
export class ProjectionService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly bus: EventBus,
  ) {}

  /** Append an event to the durable log and fan it out to live subscribers. */
  emit(type: ProjectionEventType, data: Record<string, unknown>): ProjectionEvent {
    const event = this.repos.projection.append(this.eventId, type, data);
    this.bus.publish(this.eventId, event);
    return event;
  }

  /** Current scene, derived from the last operator scene change. */
  scene(): string {
    const last = this.repos.projection.lastOfType(this.eventId, "scene.changed");
    const scene = last?.data.scene;
    return typeof scene === "string" ? scene : DEFAULT_SCENE;
  }

  snapshot(): ProjectionSnapshot {
    const participants = this.repos.participants.listByEvent(this.eventId);
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
      scene: this.scene(),
      latestSeq: this.repos.projection.latestSeq(this.eventId),
      generatedAt: now(),
      participants: tiles,
      stats: {
        checkedIn: participants.length,
        missionsCompleted: this.repos.participantMissions.countCompleted(this.eventId),
        drinksActive: this.repos.drinkOrders.listActive(this.eventId).length,
      },
    };
  }

  eventsSince(sinceSeq: number): ProjectionEvent[] {
    return this.repos.projection.listSince(this.eventId, sinceSeq);
  }

  subscribe(listener: (event: ProjectionEvent) => void): () => void {
    return this.bus.subscribe(this.eventId, listener);
  }
}
