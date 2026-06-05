import type { DrinkStatus } from "@/constants/drinks";
import { now } from "@/lib/time";
import { newId } from "@/domain/ids";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { DrinkOrder } from "@/domain/types";

interface DrinkOrderRow {
  id: string;
  event_id: string;
  participant_id: string;
  conversation_id: string | null;
  raw_text: string;
  menu_item_id: string;
  label: string;
  modifiers: string;
  status: string;
  operator_notes: string | null;
  created_at: string;
  ready_at: string | null;
  picked_up_at: string | null;
}

function toDrinkOrder(row: DrinkOrderRow): DrinkOrder {
  return {
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    conversationId: row.conversation_id,
    rawText: row.raw_text,
    menuItemId: row.menu_item_id,
    label: row.label,
    modifiers: JSON.parse(row.modifiers) as string[],
    status: row.status as DrinkStatus,
    operatorNotes: row.operator_notes,
    createdAt: row.created_at,
    readyAt: row.ready_at,
    pickedUpAt: row.picked_up_at,
  };
}

export class DrinkOrdersRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "drink_orders");
  }

  async insert(o: DrinkOrder): Promise<void> {
    await this.db.query(
      `INSERT INTO drink_orders
        (id, event_id, participant_id, conversation_id, raw_text, menu_item_id, label, modifiers, status, operator_notes, created_at, ready_at, picked_up_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        o.id,
        o.eventId,
        o.participantId,
        o.conversationId,
        o.rawText,
        o.menuItemId,
        o.label,
        JSON.stringify(o.modifiers),
        o.status,
        o.operatorNotes,
        o.createdAt,
        o.readyAt,
        o.pickedUpAt,
      ],
    );
  }

  async findById(id: string): Promise<DrinkOrder | null> {
    const rows = await this.db.query<DrinkOrderRow>(`SELECT * FROM drink_orders WHERE id = $1`, [id]);
    return rows[0] ? toDrinkOrder(rows[0]) : null;
  }

  /** Open orders the bar still cares about, oldest first. */
  async listActive(eventId: string): Promise<DrinkOrder[]> {
    const rows = await this.db.query<DrinkOrderRow>(
      `SELECT * FROM drink_orders
       WHERE event_id = $1 AND status IN ('queued','in_progress','ready')
       ORDER BY created_at ASC`,
      [eventId],
    );
    return rows.map(toDrinkOrder);
  }

  async listByEvent(eventId: string, limit = 200): Promise<DrinkOrder[]> {
    const rows = await this.db.query<DrinkOrderRow>(
      `SELECT * FROM drink_orders WHERE event_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [eventId, limit],
    );
    return rows.map(toDrinkOrder);
  }

  /** Orders made and waiting for pickup, oldest first. The sweep nudges stale ones. */
  async listReady(eventId: string): Promise<DrinkOrder[]> {
    const rows = await this.db.query<DrinkOrderRow>(
      `SELECT * FROM drink_orders WHERE event_id = $1 AND status = 'ready' ORDER BY ready_at ASC`,
      [eventId],
    );
    return rows.map(toDrinkOrder);
  }

  /** A guest's most recent ready order, for confirm_pickup. */
  async findReadyByParticipant(participantId: string): Promise<DrinkOrder | null> {
    const rows = await this.db.query<DrinkOrderRow>(
      `SELECT * FROM drink_orders WHERE participant_id = $1 AND status = 'ready' ORDER BY ready_at DESC LIMIT 1`,
      [participantId],
    );
    return rows[0] ? toDrinkOrder(rows[0]) : null;
  }

  /** A guest's most recent still-open order, so the Live Player can show its live status. */
  async findLatestActiveByParticipant(participantId: string): Promise<DrinkOrder | null> {
    const rows = await this.db.query<DrinkOrderRow>(
      `SELECT * FROM drink_orders
       WHERE participant_id = $1 AND status IN ('queued','in_progress','ready')
       ORDER BY created_at DESC LIMIT 1`,
      [participantId],
    );
    return rows[0] ? toDrinkOrder(rows[0]) : null;
  }

  /**
   * A still-open order for the same item the guest placed since `sinceIso`. Used to
   * collapse accidental double-submits (model retry, double-tap, deferred-intent
   * replay) into one order instead of queueing the same drink twice.
   */
  async findRecentActiveByItem(
    participantId: string,
    menuItemId: string,
    sinceIso: string,
  ): Promise<DrinkOrder | null> {
    const rows = await this.db.query<DrinkOrderRow>(
      `SELECT * FROM drink_orders
       WHERE participant_id = $1 AND menu_item_id = $2
         AND status IN ('queued','in_progress','ready')
         AND created_at >= $3
       ORDER BY created_at DESC LIMIT 1`,
      [participantId, menuItemId, sinceIso],
    );
    return rows[0] ? toDrinkOrder(rows[0]) : null;
  }

  async countOpenByParticipant(participantId: string): Promise<number> {
    const rows = await this.db.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM drink_orders
       WHERE participant_id = $1 AND status IN ('queued','in_progress','ready')`,
      [participantId],
    );
    return rows[0]?.c ?? 0;
  }

  /**
   * Cocktail vouchers a guest has spent: any cocktail order that isn't a clean
   * operator "cancelled" (a picked-up or expired cocktail still counts as used).
   * `cocktailIds` is the static cocktail menu set, inlined as placeholders so the
   * query stays dialect-safe on both pg and pglite.
   */
  async countCocktailsByParticipant(participantId: string, cocktailIds: readonly string[]): Promise<number> {
    if (cocktailIds.length === 0) return 0;
    const ph = cocktailIds.map((_, i) => `$${i + 2}`).join(",");
    const rows = await this.db.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM drink_orders
       WHERE participant_id = $1 AND status <> 'cancelled' AND menu_item_id IN (${ph})`,
      [participantId, ...cocktailIds],
    );
    return rows[0]?.c ?? 0;
  }

  /** Cocktail vouchers spent across the whole event (the 150-pour pool). */
  async countCocktailsByEvent(eventId: string, cocktailIds: readonly string[]): Promise<number> {
    if (cocktailIds.length === 0) return 0;
    const ph = cocktailIds.map((_, i) => `$${i + 2}`).join(",");
    const rows = await this.db.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM drink_orders
       WHERE event_id = $1 AND status <> 'cancelled' AND menu_item_id IN (${ph})`,
      [eventId, ...cocktailIds],
    );
    return rows[0]?.c ?? 0;
  }

  /** Operator edit: swap the ordered item and its modifiers, leaving status/history intact. */
  async updateItem(
    id: string,
    menuItemId: string,
    label: string,
    modifiers: string[],
  ): Promise<DrinkOrder | null> {
    const rows = await this.db.query<DrinkOrderRow>(
      `UPDATE drink_orders SET menu_item_id = $1, label = $2, modifiers = $3 WHERE id = $4 RETURNING *`,
      [menuItemId, label, JSON.stringify(modifiers), id],
    );
    return rows[0] ? toDrinkOrder(rows[0]) : null;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM drink_orders WHERE id = $1 RETURNING id`,
      [id],
    );
    return rows.length === 1;
  }

  /** Drop every order (and its events) for a guest. Used when an operator deletes the guest. */
  async removeByParticipant(participantId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM drink_order_events WHERE order_id IN (SELECT id FROM drink_orders WHERE participant_id = $1)`,
      [participantId],
    );
    await this.db.query(`DELETE FROM drink_orders WHERE participant_id = $1`, [participantId]);
  }

  /** Update status, stamping ready_at / picked_up_at as the order moves. */
  async setStatus(id: string, status: DrinkStatus, note: string | null): Promise<DrinkOrder | null> {
    const ts = now();
    const rows = await this.db.query<DrinkOrderRow>(
      `UPDATE drink_orders
       SET status = $1,
           operator_notes = COALESCE($2, operator_notes),
           ready_at = CASE WHEN $1 = 'ready' AND ready_at IS NULL THEN $3 ELSE ready_at END,
           picked_up_at = CASE WHEN $1 = 'picked_up' AND picked_up_at IS NULL THEN $3 ELSE picked_up_at END
       WHERE id = $4
       RETURNING *`,
      [status, note, ts, id],
    );
    return rows[0] ? toDrinkOrder(rows[0]) : null;
  }
}

export class DrinkOrderEventsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "drink_order_events");
  }

  async insert(orderId: string, status: string, note: string | null): Promise<void> {
    await this.db.query(
      `INSERT INTO drink_order_events (id, order_id, status, note, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [newId("doe"), orderId, status, note, now()],
    );
  }

  async deleteByOrder(orderId: string): Promise<void> {
    await this.db.query(`DELETE FROM drink_order_events WHERE order_id = $1`, [orderId]);
  }

  async listByOrder(
    orderId: string,
  ): Promise<{ status: string; note: string | null; createdAt: string }[]> {
    const rows = await this.db.query<{ status: string; note: string | null; created_at: string }>(
      `SELECT status, note, created_at FROM drink_order_events WHERE order_id = $1 ORDER BY created_at ASC`,
      [orderId],
    );
    return rows.map((r) => ({ status: r.status, note: r.note, createdAt: r.created_at }));
  }
}
