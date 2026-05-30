/**
 * Apply the schema to the Postgres pointed at by SUPABASE_DB_URL (idempotent;
 * `CREATE TABLE IF NOT EXISTS ...`). Run once after creating the Supabase
 * project and again whenever the schema changes.
 *
 * Usage: pnpm migrate
 */
import { loadScriptEnv, requireDatabaseUrl } from "@/lib/env";

loadScriptEnv();

import { applySchema } from "@/server/db/connection";
import { createPgDb } from "@/server/db/pg";

async function main(): Promise<void> {
  const db = createPgDb(requireDatabaseUrl());
  await applySchema(db);
  const tables = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
  );
  console.log(`✓ schema applied. public tables: ${tables.map((t) => t.table_name).join(", ")}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("migrate failed:", err);
  process.exit(1);
});
