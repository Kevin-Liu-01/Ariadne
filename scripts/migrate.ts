/**
 * Apply the schema to the Postgres pointed at by SUPABASE_DB_URL (idempotent;
 * `CREATE TABLE IF NOT EXISTS ...`). Run once after creating the Supabase
 * project and again whenever the schema changes.
 *
 * Usage: pnpm migrate
 */
import { loadScriptEnv, requireDatabaseUrl } from "@/lib/env";

loadScriptEnv();

import { applySchema, type Db } from "@/server/db/connection";
import { createPgDb } from "@/server/db/pg";

/** Drop duplicate reminder rows so idx_reminders_dedupe can be created (keeps earliest send). */
async function dedupeReminders(db: Db): Promise<void> {
  const removed = await db.query<{ id: string }>(
    `DELETE FROM reminders
     WHERE id IN (
       SELECT id FROM (
         SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY event_id, participant_id, kind, COALESCE(ref_id, '')
             ORDER BY sent_at ASC
           ) AS rn
         FROM reminders
       ) AS ranked
       WHERE rn > 1
     )
     RETURNING id`,
  );
  if (removed.length > 0) {
    console.log(`removed ${removed.length} duplicate reminder row(s) before creating dedupe index`);
  }
}

async function main(): Promise<void> {
  const db = createPgDb(requireDatabaseUrl());
  await dedupeReminders(db);
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
