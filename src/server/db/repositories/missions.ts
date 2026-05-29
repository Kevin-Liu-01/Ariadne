import type { ParticipantMissionStatus } from "@/constants/missions";
import { now } from "@/lib/time";
import { newId } from "@/domain/ids";
import type { DB } from "@/server/db/connection";
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
  constructor(db: DB) {
    super(db, "participant_missions");
  }

  /** Assign a mission once. Returns false if it was already assigned. */
  assign(eventId: string, participantId: string, missionId: string): boolean {
    const result = this.stmt(
      `INSERT OR IGNORE INTO participant_missions
        (id, event_id, participant_id, mission_id, status, points_awarded, assigned_at)
       VALUES (?, ?, ?, ?, 'assigned', 0, ?)`,
    ).run(newId("pm"), eventId, participantId, missionId, now());
    return result.changes === 1;
  }

  find(participantId: string, missionId: string): ParticipantMission | null {
    const row = this.stmt(
      `SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ?`,
    ).get(participantId, missionId) as ParticipantMissionRow | undefined;
    return row ? toParticipantMission(row) : null;
  }

  listByParticipant(participantId: string): ParticipantMission[] {
    const rows = this.stmt(
      `SELECT * FROM participant_missions WHERE participant_id = ? ORDER BY assigned_at ASC`,
    ).all(participantId) as ParticipantMissionRow[];
    return rows.map(toParticipantMission);
  }

  completedMissionIds(participantId: string): string[] {
    const rows = this.stmt(
      `SELECT mission_id FROM participant_missions WHERE participant_id = ? AND status = 'completed'`,
    ).all(participantId) as { mission_id: string }[];
    return rows.map((r) => r.mission_id);
  }

  countCompleted(eventId: string): number {
    const row = this.stmt(
      `SELECT COUNT(*) AS c FROM participant_missions WHERE event_id = ? AND status = 'completed'`,
    ).get(eventId) as { c: number };
    return row.c;
  }

  markSubmitted(participantId: string, missionId: string): void {
    this.stmt(
      `UPDATE participant_missions SET status = 'submitted', submitted_at = ?
       WHERE participant_id = ? AND mission_id = ? AND status = 'assigned'`,
    ).run(now(), participantId, missionId);
  }

  /** Transition to completed once. Returns true only on the transition (guards double scoring). */
  markCompleted(participantId: string, missionId: string, points: number): boolean {
    const result = this.stmt(
      `UPDATE participant_missions SET status = 'completed', points_awarded = ?, completed_at = ?
       WHERE participant_id = ? AND mission_id = ? AND status != 'completed'`,
    ).run(points, now(), participantId, missionId);
    return result.changes === 1;
  }

  setStatus(participantId: string, missionId: string, status: ParticipantMissionStatus): void {
    this.stmt(
      `UPDATE participant_missions SET status = ? WHERE participant_id = ? AND mission_id = ?`,
    ).run(status, participantId, missionId);
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
  constructor(db: DB) {
    super(db, "mission_events");
  }

  insert(e: MissionEvent): void {
    this.stmt(
      `INSERT INTO mission_events
        (id, event_id, participant_id, mission_id, raw_answer, normalized_answer, partner_game_ids, result, points_awarded, created_at)
       VALUES (@id, @event_id, @participant_id, @mission_id, @raw_answer, @normalized_answer, @partner_game_ids, @result, @points_awarded, @created_at)`,
    ).run({
      id: e.id,
      event_id: e.eventId,
      participant_id: e.participantId,
      mission_id: e.missionId,
      raw_answer: e.rawAnswer,
      normalized_answer: e.normalizedAnswer,
      partner_game_ids: JSON.stringify(e.partnerGameIds),
      result: e.result,
      points_awarded: e.pointsAwarded,
      created_at: e.createdAt,
    });
  }

  listByParticipant(participantId: string): MissionEvent[] {
    const rows = this.stmt(
      `SELECT * FROM mission_events WHERE participant_id = ? ORDER BY created_at ASC`,
    ).all(participantId) as MissionEventRow[];
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
