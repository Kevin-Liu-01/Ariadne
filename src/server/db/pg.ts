import { Pool, type PoolClient } from "pg";
import type { Db, Row } from "@/server/db/connection";

/**
 * node-postgres-backed {@link Db}. At the top level the handle is a `Pool`; inside
 * a transaction it is a checked-out `PoolClient` so every statement runs on the
 * same connection between BEGIN and COMMIT.
 */
class PgDb implements Db {
  constructor(private readonly handle: Pool | PoolClient) {}

  async query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.handle.query(text, params as unknown[]);
    return res.rows as T[];
  }

  async exec(sql: string): Promise<void> {
    await this.handle.query(sql);
  }

  async transaction<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    // Nested call (already on a client): stay in the open transaction.
    if (!(this.handle instanceof Pool)) return work(this);
    const client = await this.handle.connect();
    try {
      await client.query("BEGIN");
      const out = await work(new PgDb(client));
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

/**
 * Open a pooled connection to Postgres. In production this is the Supabase
 * transaction pooler, which requires SSL; we skip SSL only for local Postgres.
 */
export function createPgDb(connectionString: string): Db {
  const local = /localhost|127\.0\.0\.1/.test(connectionString);
  const pool = new Pool({
    connectionString,
    // The Supabase transaction pooler (port 6543) already multiplexes, so each
    // serverless instance needs just one client connection. Holding more per
    // instance multiplies across the warm Vercel fleet and trips the pooler's
    // client-connection ceiling under event load (FATAL: EMAXCONN, limit 200).
    // Override with ARIADNE_PG_POOL_MAX when pointing at a direct, unpooled DB.
    max: Number(process.env.ARIADNE_PG_POOL_MAX) || 1,
    idleTimeoutMillis: 10_000,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
  // The pooler can drop an idle client; node-postgres surfaces that as an 'error'
  // on the pool and, with no listener, rethrows it as an uncaught exception that
  // takes down the whole instance. Log and let the pool replace the connection.
  pool.on("error", (err) => {
    console.error("[pg] idle client error:", err.message);
  });
  return new PgDb(pool);
}
