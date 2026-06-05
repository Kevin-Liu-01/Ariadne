import { now } from "@/lib/time";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";

/**
 * Riddles whose answer we revealed to a guest after the hint ladder ran out.
 * The reveal is the canonical signal that a later solve scores at the reduced
 * rate, so it survives out-of-order solving instead of being inferred from
 * attempt counts. Mirrors {@link RiddleSolvesRepository}.
 */
export class RiddleRevealsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "riddle_reveals");
  }

  /** Record a reveal once. Returns true only on the first reveal of this riddle for the guest. */
  async markRevealed(eventId: string, participantId: string, riddleId: string): Promise<boolean> {
    const rows = await this.db.query<{ riddle_id: string }>(
      `INSERT INTO riddle_reveals (event_id, participant_id, riddle_id, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (participant_id, riddle_id) DO NOTHING
       RETURNING riddle_id`,
      [eventId, participantId, riddleId, now()],
    );
    return rows.length === 1;
  }

  async revealedIds(participantId: string): Promise<string[]> {
    const rows = await this.db.query<{ riddle_id: string }>(
      `SELECT riddle_id FROM riddle_reveals WHERE participant_id = $1`,
      [participantId],
    );
    return rows.map((r) => r.riddle_id);
  }

  async removeByParticipant(participantId: string): Promise<void> {
    await this.db.query(`DELETE FROM riddle_reveals WHERE participant_id = $1`, [participantId]);
  }
}
