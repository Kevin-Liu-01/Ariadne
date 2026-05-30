import { now } from "@/lib/time";
import { newId } from "@/domain/ids";
import type { DB } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";

export interface OperatorAlert {
  id: string;
  eventId: string;
  participantId: string | null;
  gameId: string | null;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
}

interface OperatorAlertRow {
  id: string;
  event_id: string;
  participant_id: string | null;
  game_id: string | null;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

function toAlert(row: OperatorAlertRow): OperatorAlert {
  return {
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    gameId: row.game_id,
    reason: row.reason,
    status: row.status as OperatorAlert["status"],
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export class OperatorAlertsRepository extends BaseRepository {
  constructor(db: DB) {
    super(db, "operator_alerts");
  }

  create(eventId: string, participantId: string | null, gameId: string | null, reason: string): OperatorAlert {
    const alert: OperatorAlert = {
      id: newId("alert"),
      eventId,
      participantId,
      gameId,
      reason,
      status: "open",
      createdAt: now(),
      resolvedAt: null,
    };
    this.stmt(
      `INSERT INTO operator_alerts (id, event_id, participant_id, game_id, reason, status, created_at, resolved_at)
       VALUES (@id, @event_id, @participant_id, @game_id, @reason, @status, @created_at, @resolved_at)`,
    ).run({
      id: alert.id,
      event_id: alert.eventId,
      participant_id: alert.participantId,
      game_id: alert.gameId,
      reason: alert.reason,
      status: alert.status,
      created_at: alert.createdAt,
      resolved_at: alert.resolvedAt,
    });
    return alert;
  }

  listOpen(eventId: string): OperatorAlert[] {
    const rows = this.stmt(
      `SELECT * FROM operator_alerts WHERE event_id = ? AND status = 'open' ORDER BY created_at ASC`,
    ).all(eventId) as OperatorAlertRow[];
    return rows.map(toAlert);
  }

  resolve(id: string): void {
    this.stmt(`UPDATE operator_alerts SET status = 'resolved', resolved_at = ? WHERE id = ?`).run(
      now(),
      id,
    );
  }
}
