import { PGlite } from "@electric-sql/pglite";
import { applySchema, type Db, type Row } from "@/server/db/connection";

/** The subset of PGlite / its Transaction that we drive. */
interface PgliteHandle {
  query<T>(query: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(query: string): Promise<unknown>;
}

/**
 * pglite-backed {@link Db}: real Postgres semantics, in-process, no network. Used
 * by the test suite and offline dev so the same SQL the Supabase pooler runs is
 * exercised locally.
 */
class PgliteDb implements Db {
  constructor(
    private readonly handle: PgliteHandle,
    private readonly inTx = false,
  ) {}

  async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.handle.query<T>(text, params);
    return res.rows;
  }

  async exec(sql: string): Promise<void> {
    await this.handle.exec(sql);
  }

  async transaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    if (this.inTx || !(this.handle instanceof PGlite)) return work(this);
    return this.handle.transaction((tx) =>
      work(new PgliteDb(tx as unknown as PgliteHandle, true)),
    ) as Promise<T>;
  }
}

/** Create an in-memory pglite database with the schema applied. */
export async function createPgliteDb(): Promise<Db> {
  const db = new PgliteDb(new PGlite());
  await applySchema(db);
  return db;
}
