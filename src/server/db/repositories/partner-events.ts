import type { DB } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { PartnerEvent } from "@/domain/types";

export class PartnerEventsRepository extends BaseRepository {
  constructor(db: DB) {
    super(db, "partner_events");
  }

  /**
   * Persist a raw partner event exactly once. Returns true if newly recorded,
   * false if this `(provider, webhook_id)` was already seen (idempotency).
   */
  recordOnce(e: PartnerEvent): boolean {
    const result = this.stmt(
      `INSERT OR IGNORE INTO partner_events
        (id, event_id, provider, webhook_id, event_type, channel, payload, status, created_at)
       VALUES (@id, @event_id, @provider, @webhook_id, @event_type, @channel, @payload, @status, @created_at)`,
    ).run({
      id: e.id,
      event_id: e.eventId,
      provider: e.provider,
      webhook_id: e.webhookId,
      event_type: e.eventType,
      channel: e.channel,
      payload: e.payload,
      status: e.status,
      created_at: e.createdAt,
    });
    return result.changes === 1;
  }

  markStatus(webhookId: string, status: PartnerEvent["status"]): void {
    this.stmt(`UPDATE partner_events SET status = ? WHERE webhook_id = ?`).run(status, webhookId);
  }
}
