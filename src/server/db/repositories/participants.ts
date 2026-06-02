import type { GemId } from "@/constants/gems";
import { now } from "@/lib/time";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { Participant } from "@/domain/types";

interface ParticipantRow {
  id: string;
  event_id: string;
  game_id: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  gem: string;
  secret_word: string;
  station_id: string | null;
  score: number;
  eliminated: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    eventId: row.event_id,
    gameId: row.game_id,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    gem: row.gem as GemId,
    secretWord: row.secret_word,
    stationId: row.station_id,
    score: row.score,
    eliminated: row.eliminated,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ParticipantsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "participants");
  }

  async insert(p: Participant): Promise<void> {
    await this.db.query(
      `INSERT INTO participants
        (id, event_id, game_id, display_name, phone, email, gem, secret_word, station_id, score, eliminated, photo_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        p.id,
        p.eventId,
        p.gameId,
        p.displayName,
        p.phone,
        p.email,
        p.gem,
        p.secretWord,
        p.stationId,
        p.score,
        p.eliminated,
        p.photoUrl,
        p.createdAt,
        p.updatedAt,
      ],
    );
  }

  async findByEmail(eventId: string, email: string): Promise<Participant | null> {
    const rows = await this.db.query<ParticipantRow>(
      `SELECT * FROM participants WHERE event_id = $1 AND email = $2`,
      [eventId, email.toLowerCase()],
    );
    return rows[0] ? toParticipant(rows[0]) : null;
  }

  async findById(id: string): Promise<Participant | null> {
    const rows = await this.db.query<ParticipantRow>(`SELECT * FROM participants WHERE id = $1`, [id]);
    return rows[0] ? toParticipant(rows[0]) : null;
  }

  async findByGameId(eventId: string, gameId: string): Promise<Participant | null> {
    const rows = await this.db.query<ParticipantRow>(
      `SELECT * FROM participants WHERE event_id = $1 AND game_id = $2`,
      [eventId, gameId.toUpperCase()],
    );
    return rows[0] ? toParticipant(rows[0]) : null;
  }

  async findByPhone(eventId: string, phone: string): Promise<Participant | null> {
    const rows = await this.db.query<ParticipantRow>(
      `SELECT * FROM participants WHERE event_id = $1 AND phone = $2`,
      [eventId, phone],
    );
    return rows[0] ? toParticipant(rows[0]) : null;
  }

  async gameIdExists(eventId: string, gameId: string): Promise<boolean> {
    const rows = await this.db.query(
      `SELECT 1 FROM participants WHERE event_id = $1 AND game_id = $2`,
      [eventId, gameId.toUpperCase()],
    );
    return rows.length > 0;
  }

  async listByEvent(eventId: string): Promise<Participant[]> {
    const rows = await this.db.query<ParticipantRow>(
      `SELECT * FROM participants WHERE event_id = $1 ORDER BY score DESC, created_at ASC`,
      [eventId],
    );
    return rows.map(toParticipant);
  }

  /** Add to score and return the new total. */
  async addScore(id: string, delta: number): Promise<number> {
    const rows = await this.db.query<{ score: number }>(
      `UPDATE participants SET score = score + $1, updated_at = $2 WHERE id = $3 RETURNING score`,
      [delta, now(), id],
    );
    return rows[0]?.score ?? 0;
  }

  async setEliminated(id: string, eliminated: boolean): Promise<void> {
    await this.db.query(`UPDATE participants SET eliminated = $1, updated_at = $2 WHERE id = $3`, [
      eliminated,
      now(),
      id,
    ]);
  }

  async setPhoto(id: string, photoUrl: string | null): Promise<void> {
    await this.db.query(`UPDATE participants SET photo_url = $1, updated_at = $2 WHERE id = $3`, [
      photoUrl,
      now(),
      id,
    ]);
  }

  async setDisplayName(id: string, displayName: string | null): Promise<Participant | null> {
    const rows = await this.db.query<ParticipantRow>(
      `UPDATE participants SET display_name = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      [displayName, now(), id],
    );
    return rows[0] ? toParticipant(rows[0]) : null;
  }

  /** Operator edit. Only the provided fields are written; column names are literal, values parameterized. */
  async applyEdits(id: string, edit: ParticipantEdit): Promise<Participant | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    const columns: [keyof ParticipantEdit, string][] = [
      ["displayName", "display_name"],
      ["gem", "gem"],
      ["secretWord", "secret_word"],
      ["score", "score"],
      ["eliminated", "eliminated"],
    ];
    for (const [key, column] of columns) {
      if (edit[key] === undefined) continue;
      values.push(edit[key]);
      sets.push(`${column} = $${values.length}`);
    }
    if (sets.length === 0) return this.findById(id);
    values.push(now());
    sets.push(`updated_at = $${values.length}`);
    values.push(id);
    const rows = await this.db.query<ParticipantRow>(
      `UPDATE participants SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return rows[0] ? toParticipant(rows[0]) : null;
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM participants WHERE id = $1 RETURNING id`,
      [id],
    );
    return rows.length === 1;
  }
}

/** Fields an operator may change on a guest. Absent fields are left untouched. */
export interface ParticipantEdit {
  displayName?: string | null;
  gem?: GemId;
  secretWord?: string;
  score?: number;
  eliminated?: boolean;
}
