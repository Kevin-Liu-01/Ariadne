import type { GemId } from "@/constants/gems";
import { now } from "@/lib/time";
import type { DB } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { Participant } from "@/domain/types";

interface ParticipantRow {
  id: string;
  event_id: string;
  game_id: string;
  display_name: string | null;
  phone: string | null;
  gem: string;
  secret_word: string;
  station_id: string | null;
  score: number;
  eliminated: number;
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
    gem: row.gem as GemId,
    secretWord: row.secret_word,
    stationId: row.station_id,
    score: row.score,
    eliminated: row.eliminated === 1,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ParticipantsRepository extends BaseRepository {
  constructor(db: DB) {
    super(db, "participants");
  }

  insert(p: Participant): void {
    this.stmt(
      `INSERT INTO participants
        (id, event_id, game_id, display_name, phone, gem, secret_word, station_id, score, eliminated, photo_url, created_at, updated_at)
       VALUES (@id, @event_id, @game_id, @display_name, @phone, @gem, @secret_word, @station_id, @score, @eliminated, @photo_url, @created_at, @updated_at)`,
    ).run({
      id: p.id,
      event_id: p.eventId,
      game_id: p.gameId,
      display_name: p.displayName,
      phone: p.phone,
      gem: p.gem,
      secret_word: p.secretWord,
      station_id: p.stationId,
      score: p.score,
      eliminated: p.eliminated ? 1 : 0,
      photo_url: p.photoUrl,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    });
  }

  findById(id: string): Participant | null {
    const row = this.stmt(`SELECT * FROM participants WHERE id = ?`).get(id) as
      | ParticipantRow
      | undefined;
    return row ? toParticipant(row) : null;
  }

  findByGameId(eventId: string, gameId: string): Participant | null {
    const row = this.stmt(
      `SELECT * FROM participants WHERE event_id = ? AND game_id = ?`,
    ).get(eventId, gameId.toUpperCase()) as ParticipantRow | undefined;
    return row ? toParticipant(row) : null;
  }

  findByPhone(eventId: string, phone: string): Participant | null {
    const row = this.stmt(
      `SELECT * FROM participants WHERE event_id = ? AND phone = ?`,
    ).get(eventId, phone) as ParticipantRow | undefined;
    return row ? toParticipant(row) : null;
  }

  gameIdExists(eventId: string, gameId: string): boolean {
    const row = this.stmt(
      `SELECT 1 FROM participants WHERE event_id = ? AND game_id = ?`,
    ).get(eventId, gameId.toUpperCase());
    return row !== undefined;
  }

  listByEvent(eventId: string): Participant[] {
    const rows = this.stmt(
      `SELECT * FROM participants WHERE event_id = ? ORDER BY score DESC, created_at ASC`,
    ).all(eventId) as ParticipantRow[];
    return rows.map(toParticipant);
  }

  /** Gem -> count, for balanced assignment when RSVP category is unknown. */
  gemCounts(eventId: string): Record<string, number> {
    const rows = this.stmt(
      `SELECT gem, COUNT(*) AS c FROM participants WHERE event_id = ? GROUP BY gem`,
    ).all(eventId) as { gem: string; c: number }[];
    const out: Record<string, number> = {};
    for (const r of rows) out[r.gem] = r.c;
    return out;
  }

  /** secret_word -> count, so word assignment keeps phrase halves balanced. */
  secretWordCounts(eventId: string): Record<string, number> {
    const rows = this.stmt(
      `SELECT secret_word, COUNT(*) AS c FROM participants WHERE event_id = ? GROUP BY secret_word`,
    ).all(eventId) as { secret_word: string; c: number }[];
    const out: Record<string, number> = {};
    for (const r of rows) out[r.secret_word] = r.c;
    return out;
  }

  /** Add to score and return the new total. */
  addScore(id: string, delta: number): number {
    const ts = now();
    this.stmt(`UPDATE participants SET score = score + ?, updated_at = ? WHERE id = ?`).run(
      delta,
      ts,
      id,
    );
    const row = this.stmt(`SELECT score FROM participants WHERE id = ?`).get(id) as
      | { score: number }
      | undefined;
    return row?.score ?? 0;
  }

  setEliminated(id: string, eliminated: boolean): void {
    this.stmt(`UPDATE participants SET eliminated = ?, updated_at = ? WHERE id = ?`).run(
      eliminated ? 1 : 0,
      now(),
      id,
    );
  }

  setPhoto(id: string, photoUrl: string | null): void {
    this.stmt(`UPDATE participants SET photo_url = ?, updated_at = ? WHERE id = ?`).run(
      photoUrl,
      now(),
      id,
    );
  }
}
