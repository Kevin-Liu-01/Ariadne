import { newId } from "@/domain/ids";
import { now } from "@/lib/time";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";

export type SongStatus = "requested" | "accepted" | "rejected" | "played";

export interface SongRequest {
  id: string;
  eventId: string;
  participantId: string;
  rawText: string;
  status: SongStatus;
  createdAt: string;
  decidedAt: string | null;
}

interface SongRequestRow {
  id: string;
  event_id: string;
  participant_id: string;
  raw_text: string;
  status: string;
  created_at: string;
  decided_at: string | null;
}

function toSongRequest(row: SongRequestRow): SongRequest {
  return {
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    rawText: row.raw_text,
    status: row.status as SongStatus,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

/** Guest song requests bound for the DJ screen. */
export class SongRequestsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "song_requests");
  }

  async create(eventId: string, participantId: string, rawText: string): Promise<SongRequest> {
    const request: SongRequest = {
      id: newId("song"),
      eventId,
      participantId,
      rawText,
      status: "requested",
      createdAt: now(),
      decidedAt: null,
    };
    await this.db.query(
      `INSERT INTO song_requests (id, event_id, participant_id, raw_text, status, created_at, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        request.id,
        request.eventId,
        request.participantId,
        request.rawText,
        request.status,
        request.createdAt,
        request.decidedAt,
      ],
    );
    return request;
  }

  /** Most recent requests for the event (the DJ screen filters by status). */
  async listByEvent(eventId: string, limit = 100): Promise<SongRequest[]> {
    const rows = await this.db.query<SongRequestRow>(
      `SELECT * FROM song_requests WHERE event_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [eventId, limit],
    );
    return rows.map(toSongRequest);
  }

  async setStatus(id: string, status: SongStatus): Promise<SongRequest | null> {
    const rows = await this.db.query<SongRequestRow>(
      `UPDATE song_requests SET status = $1, decided_at = $2 WHERE id = $3 RETURNING *`,
      [status, now(), id],
    );
    return rows[0] ? toSongRequest(rows[0]) : null;
  }
}
