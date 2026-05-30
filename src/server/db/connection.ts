import { SCHEMA_SQL } from "@/server/db/schema";

export type Row = Record<string, unknown>;

/**
 * A Postgres-speaking handle. One SQL dialect ($1 placeholders), two backends:
 * production uses node-postgres against the Supabase pooler; tests + offline dev
 * use pglite (in-process Postgres). Repositories depend only on this interface,
 * so neither backend leaks into the other.
 */
export interface Db {
  /** Parameterized single statement. Returns the result rows. */
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  /** Multi-statement DDL (no params), used to apply the schema. */
  exec(sql: string): Promise<void>;
  /** Run `work` atomically; the handle passed in is bound to the transaction. */
  transaction<T>(work: (tx: Db) => Promise<T>): Promise<T>;
}

/** Apply the schema idempotently (`CREATE TABLE IF NOT EXISTS ...`). */
export async function applySchema(db: Db): Promise<void> {
  await db.exec(SCHEMA_SQL);
}
