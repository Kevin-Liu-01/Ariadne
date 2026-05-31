import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";

/** Atomic, monotonic per-event counters used to hand out race-free assignment indices. */
export class CountersRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "counters");
  }

  /**
   * Atomically increment `(event_id, kind)` and return the new value (first call
   * returns 1). The upsert takes a row lock, so concurrent check-ins serialize on
   * it and each receives a distinct value — no two guests share an index.
   */
  async next(eventId: string, kind: string): Promise<number> {
    const rows = await this.db.query<{ value: number }>(
      `INSERT INTO counters (event_id, kind, value) VALUES ($1, $2, 1)
       ON CONFLICT (event_id, kind) DO UPDATE SET value = counters.value + 1
       RETURNING value`,
      [eventId, kind],
    );
    return rows[0]?.value ?? 1;
  }
}
