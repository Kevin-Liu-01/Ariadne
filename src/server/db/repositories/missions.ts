import type { ParticipantMissionStatus } from "@/constants/missions";
import { now } from "@/lib/time";
import { newId } from "@/domain/ids";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { MissionEvent, ParticipantMission } from "@/domain/types";

interface ParticipantMissionRow {
  id: string;
  event_id: string;
  participant_id: string;
  mission_id: string;
  status: string;
  points_awarded: number;
  assigned_at: string;
  submitted_at: string | null;
  completed_at: string | null;
}

function toParticipantMission(row: ParticipantMissionRow): ParticipantMission {
  return {
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    missionId: row.mission_id,
    status: row.status as ParticipantMissionStatus,
    pointsAwarded: row.points_awarded,
    assignedAt: row.assigned_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
  };
}

export class ParticipantMissionsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "participant_missions");
  }

  /** Assign a mission once. Returns false if it was already assigned. */
  async assign(eventId: string, participantId: string, missionId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO participant_missions
        (id, event_id, participant_id, mission_id, status, points_awarded, assigned_at)
       VALUES ($1, $2, $3, $4, 'assigned', 0, $5)
       ON CONFLICT (participant_id, mission_id) DO NOTHING
       RETURNING id`,
      [newId("pm"), eventId, participantId, missionId, now()],
    );
    return rows.length === 1;
  }

  async find(participantId: string, missionId: string): Promise<ParticipantMission | null> {
    const rows = await this.db.query<ParticipantMissionRow>(
      `SELECT * FROM participant_missions WHERE participant_id = $1 AND mission_id = $2`,
      [participantId, missionId],
    );
    return rows[0] ? toParticipantMission(rows[0]) : null;
  }

  async listByParticipant(participantId: string): Promise<ParticipantMission[]> {
    const rows = await this.db.query<ParticipantMissionRow>(
      `SELECT * FROM participant_missions WHERE participant_id = $1 ORDER BY assigned_at ASC`,
      [participantId],
    );
    return rows.map(toParticipantMission);
  }

  async completedMissionIds(participantId: string): Promise<string[]> {
    const rows = await this.db.query<{ mission_id: string }>(
      `SELECT mission_id FROM participant_missions WHERE participant_id = $1 AND status = 'completed'`,
      [participantId],
    );
    return rows.map((r) => r.mission_id);
  }

  async countCompleted(eventId: string): Promise<number> {
    const rows = await this.db.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM participant_missions WHERE event_id = $1 AND status = 'completed'`,
      [eventId],
    );
    return rows[0]?.c ?? 0;
  }

  async markSubmitted(participantId: string, missionId: string): Promise<void> {
    await this.db.query(
      `UPDATE participant_missions SET status = 'submitted', submitted_at = $1
       WHERE participant_id = $2 AND mission_id = $3 AND status = 'assigned'`,
      [now(), participantId, missionId],
    );
  }

  /** Transition to completed once. Returns true only on the transition (guards double scoring). */
  async markCompleted(participantId: string, missionId: string, points: number): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE participant_missions SET status = 'completed', points_awarded = $1, completed_at = $2
       WHERE participant_id = $3 AND mission_id = $4 AND status <> 'completed'
       RETURNING id`,
      [points, now(), participantId, missionId],
    );
    return rows.length === 1;
  }

  async setStatus(
    participantId: string,
    missionId: string,
    status: ParticipantMissionStatus,
  ): Promise<void> {
    await this.db.query(
      `UPDATE participant_missions SET status = $1 WHERE participant_id = $2 AND mission_id = $3`,
      [status, participantId, missionId],
    );
  }
}

interface MissionEventRow {
  id: string;
  event_id: string;
  participant_id: string;
  mission_id: string;
  raw_answer: string;
  normalized_answer: string;
  partner_game_ids: string;
  result: string;
  points_awarded: number;
  created_at: string;
}

export class MissionEventsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "mission_events");
  }

  async insert(e: MissionEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO mission_events
        (id, event_id, participant_id, mission_id, raw_answer, normalized_answer, partner_game_ids, result, points_awarded, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        e.id,
        e.eventId,
        e.participantId,
        e.missionId,
        e.rawAnswer,
        e.normalizedAnswer,
        JSON.stringify(e.partnerGameIds),
        e.result,
        e.pointsAwarded,
        e.createdAt,
      ],
    );
  }

  async listByParticipant(participantId: string): Promise<MissionEvent[]> {
    const rows = await this.db.query<MissionEventRow>(
      `SELECT * FROM mission_events WHERE participant_id = $1 ORDER BY created_at ASC`,
      [participantId],
    );
    return rows.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      participantId: row.participant_id,
      missionId: row.mission_id,
      rawAnswer: row.raw_answer,
      normalizedAnswer: row.normalized_answer,
      partnerGameIds: JSON.parse(row.partner_game_ids) as string[],
      result: row.result as MissionEvent["result"],
      pointsAwarded: row.points_awarded,
      createdAt: row.created_at,
    }));
  }
}
