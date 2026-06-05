import { now } from "@/lib/time";
import { newId } from "@/domain/ids";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";

export interface Announcement {
  id: string;
  eventId: string;
  body: string;
  recipients: number; // guests the broadcast targeted
  delivered: number; // of those, how many sends the gateway accepted
  createdAt: string;
}

interface AnnouncementRow {
  id: string;
  event_id: string;
  body: string;
  recipients: number;
  delivered: number;
  created_at: string;
}

function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    eventId: row.event_id,
    body: row.body,
    recipients: row.recipients,
    delivered: row.delivered,
    createdAt: row.created_at,
  };
}

export class AnnouncementsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "announcements");
  }

  async insert(eventId: string, body: string, recipients: number, delivered: number): Promise<Announcement> {
    const row: Announcement = {
      id: newId("ann"),
      eventId,
      body,
      recipients,
      delivered,
      createdAt: now(),
    };
    await this.db.query(
      `INSERT INTO announcements (id, event_id, body, recipients, delivered, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.id, row.eventId, row.body, row.recipients, row.delivered, row.createdAt],
    );
    return row;
  }

  async listRecent(eventId: string, limit = 20): Promise<Announcement[]> {
    const rows = await this.db.query<AnnouncementRow>(
      `SELECT * FROM announcements WHERE event_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [eventId, limit],
    );
    return rows.map(toAnnouncement);
  }

  /** Operator delete: drop a sent announcement from the history log. */
  async remove(id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM announcements WHERE id = $1 RETURNING id`,
      [id],
    );
    return rows.length === 1;
  }
}
