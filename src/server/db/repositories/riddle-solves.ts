import { now } from "@/lib/time";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";

/**
 * Per-guest progress on the riddle quest: which of their 3 assigned riddles they
 * have solved. The quest completes once three rows exist for a participant.
 */
export class RiddleSolvesRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "riddle_solves");
  }

  /** Record a solved riddle once. Returns true only on the first solve (guards double scoring). */
  async markSolved(eventId: string, participantId: string, riddleId: string): Promise<boolean> {
    const rows = await this.db.query<{ riddle_id: string }>(
      `INSERT INTO riddle_solves (event_id, participant_id, riddle_id, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (participant_id, riddle_id) DO NOTHING
       RETURNING riddle_id`,
      [eventId, participantId, riddleId, now()],
    );
    return rows.length === 1;
  }

  async solvedIds(participantId: string): Promise<string[]> {
    const rows = await this.db.query<{ riddle_id: string }>(
      `SELECT riddle_id FROM riddle_solves WHERE participant_id = $1`,
      [participantId],
    );
    return rows.map((r) => r.riddle_id);
  }

  async removeByParticipant(participantId: string): Promise<void> {
    await this.db.query(`DELETE FROM riddle_solves WHERE participant_id = $1`, [participantId]);
  }
}
