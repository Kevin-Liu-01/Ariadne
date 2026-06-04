import { newId } from "@/domain/ids";
import { now } from "@/lib/time";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";

export interface ReminderRecord {
  participantId: string;
  kind: string;
  refId: string | null;
  sentAt: string;
}

interface ReminderRow {
  participant_id: string;
  kind: string;
  ref_id: string | null;
  sent_at: string;
}

/** Append-only log of proactive texts, read by the sweep to stay idempotent and gentle. */
export class RemindersRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "reminders");
  }

  async record(eventId: string, participantId: string, kind: string, refId: string | null): Promise<void> {
    await this.db.query(
      `INSERT INTO reminders (id, event_id, participant_id, kind, ref_id, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newId("rem"), eventId, participantId, kind, refId, now()],
    );
  }

  /** Insert only if this guest/kind/ref has not been logged yet. Returns false on duplicate. */
  async tryRecord(
    eventId: string,
    participantId: string,
    kind: string,
    refId: string | null,
  ): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO reminders (id, event_id, participant_id, kind, ref_id, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [newId("rem"), eventId, participantId, kind, refId, now()],
    );
    return rows.length > 0;
  }

  /** Count proactive texts for a guest/kind whose ref_id starts with a prefix (e.g. ready:orderId:). */
  async countByKindRefPrefix(
    eventId: string,
    participantId: string,
    kind: string,
    refPrefix: string,
  ): Promise<number> {
    const rows = await this.db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM reminders
       WHERE event_id = $1 AND participant_id = $2 AND kind = $3 AND ref_id LIKE $4`,
      [eventId, participantId, kind, `${refPrefix}%`],
    );
    return rows[0]?.n ?? 0;
  }

  /** Every reminder for the event, newest first. The event lifetime is short, so this stays small. */
  async listByEvent(eventId: string): Promise<ReminderRecord[]> {
    const rows = await this.db.query<ReminderRow>(
      `SELECT participant_id, kind, ref_id, sent_at FROM reminders WHERE event_id = $1 ORDER BY sent_at DESC`,
      [eventId],
    );
    return rows.map((r) => ({
      participantId: r.participant_id,
      kind: r.kind,
      refId: r.ref_id,
      sentAt: r.sent_at,
    }));
  }
}
