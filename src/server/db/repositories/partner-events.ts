import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { PartnerEvent } from "@/domain/types";

/** Whether a delivery should be processed now, or skipped because we have seen it. */
export type WebhookClaim = "claimed" | "duplicate";

export class PartnerEventsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "partner_events");
  }

  /**
   * Claim a delivery for processing, atomically and at-most-once. A fresh
   * `(provider, webhook_id)` is recorded `received` → "claimed". A repeat of an
   * in-flight (`received`) or completed (`processed`) delivery → "duplicate", so we
   * never double-reply. Only a prior *failed* (`error`) attempt is re-claimed, so an
   * AgentPhone retry can still recover it.
   *
   * The `processed` commit (via {@link markStatus}, written only after the reply is
   * sent) is what makes a turn permanently idempotent — not this initial claim. That
   * ordering is deliberate: a turn that never finished must remain recoverable.
   */
  async claim(e: PartnerEvent): Promise<WebhookClaim> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO partner_events
        (id, event_id, provider, webhook_id, event_type, channel, payload, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (provider, webhook_id) DO UPDATE
         SET status = 'received', payload = EXCLUDED.payload, created_at = EXCLUDED.created_at
         WHERE partner_events.status = 'error'
       RETURNING id`,
      [e.id, e.eventId, e.provider, e.webhookId, e.eventType, e.channel, e.payload, e.status, e.createdAt],
    );
    return rows.length === 1 ? "claimed" : "duplicate";
  }

  async markStatus(webhookId: string, status: PartnerEvent["status"]): Promise<void> {
    await this.db.query(`UPDATE partner_events SET status = $1 WHERE webhook_id = $2`, [status, webhookId]);
  }
}
