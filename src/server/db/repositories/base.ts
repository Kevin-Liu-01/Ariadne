import type Database from "better-sqlite3";
import type { DB } from "@/server/db/connection";

type Stmt = Database.Statement;

/** Shared repository behavior: a DB handle, the table name, and cached statements. */
export abstract class BaseRepository {
  private readonly cache = new Map<string, Stmt>();

  constructor(
    protected readonly db: DB,
    protected readonly table: string,
  ) {}

  /** Prepare-and-cache a statement by its SQL text. */
  protected stmt(sql: string): Stmt {
    const cached = this.cache.get(sql);
    if (cached) return cached;
    const prepared = this.db.prepare(sql) as Stmt;
    this.cache.set(sql, prepared);
    return prepared;
  }

  count(): number {
    const row = this.stmt(`SELECT COUNT(*) AS c FROM ${this.table}`).get() as { c: number };
    return row.c;
  }
}
