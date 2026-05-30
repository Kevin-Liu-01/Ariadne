import { now } from "@/lib/time";
import type { Db } from "@/server/db/connection";
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
  constructor(db: Db) {
    super(db, "projection_events");
  }

  /** Append an event and return it (with its assigned sequence number). */
  async append(
    eventId: string,
    type: ProjectionEventType,
    data: Record<string, unknown>,
  ): Promise<ProjectionEvent> {
    const createdAt = now();
    const rows = await this.db.query<{ seq: number }>(
      `INSERT INTO projection_events (event_id, type, data, created_at) VALUES ($1, $2, $3, $4) RETURNING seq`,
      [eventId, type, JSON.stringify(data), createdAt],
    );
    return { seq: rows[0]?.seq ?? 0, eventId, type, data, createdAt };
  }

  /** Events strictly after `sinceSeq`, for the board's incremental poll. */
  async listSince(eventId: string, sinceSeq: number, limit = 500): Promise<ProjectionEvent[]> {
    const rows = await this.db.query<ProjectionEventRow>(
      `SELECT * FROM projection_events WHERE event_id = $1 AND seq > $2 ORDER BY seq ASC LIMIT $3`,
      [eventId, sinceSeq, limit],
    );
    return rows.map(toProjectionEvent);
  }

  async latestSeq(eventId: string): Promise<number> {
    const rows = await this.db.query<{ seq: number }>(
      `SELECT COALESCE(MAX(seq), 0)::int AS seq FROM projection_events WHERE event_id = $1`,
      [eventId],
    );
    return rows[0]?.seq ?? 0;
  }

  /** Most recent event of a given type, or null. Used to derive current scene. */
  async lastOfType(eventId: string, type: ProjectionEventType): Promise<ProjectionEvent | null> {
    const rows = await this.db.query<ProjectionEventRow>(
      `SELECT * FROM projection_events WHERE event_id = $1 AND type = $2 ORDER BY seq DESC LIMIT 1`,
      [eventId, type],
    );
    return rows[0] ? toProjectionEvent(rows[0]) : null;
  }
}
