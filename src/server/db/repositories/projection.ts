import { now } from "@/lib/time";
import type { DB } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { ProjectionEvent, ProjectionEventType } from "@/domain/types";

interface ProjectionEventRow {
  seq: number;
  event_id: string;
  type: string;
  data: string;
  created_at: string;
}

function toProjectionEvent(row: ProjectionEventRow): ProjectionEvent {
  return {
    seq: row.seq,
    eventId: row.event_id,
    type: row.type as ProjectionEventType,
    data: JSON.parse(row.data) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

export class ProjectionEventsRepository extends BaseRepository {
  constructor(db: DB) {
    super(db, "projection_events");
  }

  /** Append an event and return it (with its assigned sequence number). */
  append(
    eventId: string,
    type: ProjectionEventType,
    data: Record<string, unknown>,
  ): ProjectionEvent {
    const createdAt = now();
    const result = this.stmt(
      `INSERT INTO projection_events (event_id, type, data, created_at) VALUES (?, ?, ?, ?)`,
    ).run(eventId, type, JSON.stringify(data), createdAt);
    return {
      seq: Number(result.lastInsertRowid),
      eventId,
      type,
      data,
      createdAt,
    };
  }

  /** Events strictly after `sinceSeq`, for SSE catch-up after a reconnect. */
  listSince(eventId: string, sinceSeq: number, limit = 500): ProjectionEvent[] {
    const rows = this.stmt(
      `SELECT * FROM projection_events WHERE event_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?`,
    ).all(eventId, sinceSeq, limit) as ProjectionEventRow[];
    return rows.map(toProjectionEvent);
  }

  latestSeq(eventId: string): number {
    const row = this.stmt(
      `SELECT COALESCE(MAX(seq), 0) AS seq FROM projection_events WHERE event_id = ?`,
    ).get(eventId) as { seq: number };
    return row.seq;
  }

  /** Most recent event of a given type, or null. Used to derive current scene. */
  lastOfType(eventId: string, type: ProjectionEventType): ProjectionEvent | null {
    const row = this.stmt(
      `SELECT * FROM projection_events WHERE event_id = ? AND type = ? ORDER BY seq DESC LIMIT 1`,
    ).get(eventId, type) as ProjectionEventRow | undefined;
    return row ? toProjectionEvent(row) : null;
  }
}
