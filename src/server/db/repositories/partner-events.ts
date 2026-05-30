import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { PartnerEvent } from "@/domain/types";

export class PartnerEventsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "partner_events");
  }

  /**
   * Persist a raw partner event exactly once. Returns true if newly recorded,
   * false if this `(provider, webhook_id)` was already seen (idempotency). The
   * conflict target is the unique index; DO NOTHING + RETURNING tells us which.
   */
  async recordOnce(e: PartnerEvent): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO partner_events
        (id, event_id, provider, webhook_id, event_type, channel, payload, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (provider, webhook_id) DO NOTHING
       RETURNING id`,
      [e.id, e.eventId, e.provider, e.webhookId, e.eventType, e.channel, e.payload, e.status, e.createdAt],
    );
    return rows.length === 1;
  }

  async markStatus(webhookId: string, status: PartnerEvent["status"]): Promise<void> {
    await this.db.query(`UPDATE partner_events SET status = $1 WHERE webhook_id = $2`, [status, webhookId]);
  }
}
