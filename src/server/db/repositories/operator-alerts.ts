import { now } from "@/lib/time";
import { newId } from "@/domain/ids";
import type { Db } from "@/server/db/connection";
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
  constructor(db: Db) {
    super(db, "operator_alerts");
  }

  async create(
    eventId: string,
    participantId: string | null,
    gameId: string | null,
    reason: string,
  ): Promise<OperatorAlert> {
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
    await this.db.query(
      `INSERT INTO operator_alerts (id, event_id, participant_id, game_id, reason, status, created_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        alert.id,
        alert.eventId,
        alert.participantId,
        alert.gameId,
        alert.reason,
        alert.status,
        alert.createdAt,
        alert.resolvedAt,
      ],
    );
    return alert;
  }

  async listOpen(eventId: string): Promise<OperatorAlert[]> {
    const rows = await this.db.query<OperatorAlertRow>(
      `SELECT * FROM operator_alerts WHERE event_id = $1 AND status = 'open' ORDER BY created_at ASC`,
      [eventId],
    );
    return rows.map(toAlert);
  }

  async resolve(id: string): Promise<void> {
    await this.db.query(`UPDATE operator_alerts SET status = 'resolved', resolved_at = $1 WHERE id = $2`, [
      now(),
      id,
    ]);
  }
}
