import type { Db } from "@/server/db/connection";

/** Shared repository behavior: a Db handle, the table name, and a row count. */
export abstract class BaseRepository {
  constructor(
    protected readonly db: Db,
    protected readonly table: string,
  ) {}

  async count(): Promise<number> {
    const rows = await this.db.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM ${this.table}`,
    );
    return rows[0]?.c ?? 0;
  }
}
