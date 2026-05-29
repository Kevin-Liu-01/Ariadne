import type { DrinkStatus } from "@/constants/drinks";
import { now } from "@/lib/time";
import { newId } from "@/domain/ids";
import type { DB } from "@/server/db/connection";
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

const ACTIVE_STATUSES = ["queued", "in_progress", "ready"];

export class DrinkOrdersRepository extends BaseRepository {
  constructor(db: DB) {
    super(db, "drink_orders");
  }

  insert(o: DrinkOrder): void {
    this.stmt(
      `INSERT INTO drink_orders
        (id, event_id, participant_id, conversation_id, raw_text, menu_item_id, label, modifiers, status, operator_notes, created_at, ready_at, picked_up_at)
       VALUES (@id, @event_id, @participant_id, @conversation_id, @raw_text, @menu_item_id, @label, @modifiers, @status, @operator_notes, @created_at, @ready_at, @picked_up_at)`,
    ).run({
      id: o.id,
      event_id: o.eventId,
      participant_id: o.participantId,
      conversation_id: o.conversationId,
      raw_text: o.rawText,
      menu_item_id: o.menuItemId,
      label: o.label,
      modifiers: JSON.stringify(o.modifiers),
      status: o.status,
      operator_notes: o.operatorNotes,
      created_at: o.createdAt,
      ready_at: o.readyAt,
      picked_up_at: o.pickedUpAt,
    });
  }

  findById(id: string): DrinkOrder | null {
    const row = this.stmt(`SELECT * FROM drink_orders WHERE id = ?`).get(id) as
      | DrinkOrderRow
      | undefined;
    return row ? toDrinkOrder(row) : null;
  }

  /** Open orders the bar still cares about, oldest first. */
  listActive(eventId: string): DrinkOrder[] {
    const rows = this.stmt(
      `SELECT * FROM drink_orders
       WHERE event_id = ? AND status IN ('queued','in_progress','ready')
       ORDER BY created_at ASC`,
    ).all(eventId) as DrinkOrderRow[];
    return rows.map(toDrinkOrder);
  }

  listByEvent(eventId: string, limit = 200): DrinkOrder[] {
    const rows = this.stmt(
      `SELECT * FROM drink_orders WHERE event_id = ? ORDER BY created_at DESC LIMIT ?`,
    ).all(eventId, limit) as DrinkOrderRow[];
    return rows.map(toDrinkOrder);
  }

  countOpenByParticipant(participantId: string): number {
    const row = this.stmt(
      `SELECT COUNT(*) AS c FROM drink_orders
       WHERE participant_id = ? AND status IN ('queued','in_progress','ready')`,
    ).get(participantId) as { c: number };
    return row.c;
  }

  /** Update status, stamping ready_at / picked_up_at as the order moves. */
  setStatus(id: string, status: DrinkStatus, note: string | null): DrinkOrder | null {
    const ts = now();
    this.stmt(
      `UPDATE drink_orders
       SET status = ?,
           operator_notes = COALESCE(?, operator_notes),
           ready_at = CASE WHEN ? = 'ready' AND ready_at IS NULL THEN ? ELSE ready_at END,
           picked_up_at = CASE WHEN ? = 'picked_up' AND picked_up_at IS NULL THEN ? ELSE picked_up_at END
       WHERE id = ?`,
    ).run(status, note, status, ts, status, ts, id);
    return this.findById(id);
  }
}

export class DrinkOrderEventsRepository extends BaseRepository {
  constructor(db: DB) {
    super(db, "drink_order_events");
  }

  insert(orderId: string, status: string, note: string | null): void {
    this.stmt(
      `INSERT INTO drink_order_events (id, order_id, status, note, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(newId("doe"), orderId, status, note, now());
  }

  listByOrder(orderId: string): { status: string; note: string | null; createdAt: string }[] {
    const rows = this.stmt(
      `SELECT status, note, created_at FROM drink_order_events WHERE order_id = ? ORDER BY created_at ASC`,
    ).all(orderId) as { status: string; note: string | null; created_at: string }[];
    return rows.map((r) => ({ status: r.status, note: r.note, createdAt: r.created_at }));
  }
}
