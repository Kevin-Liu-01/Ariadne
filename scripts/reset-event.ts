/**
 * Wipe all guest and run-of-show state for one event so check-in starts fresh.
 * Keeps fuser_assets (projection media). Requires --yes.
 *
 * Usage: pnpm reset-event --yes
 */
import { env, loadScriptEnv } from "@/lib/env";

loadScriptEnv();

import { createPgDb } from "@/server/db/pg";
import type { Db } from "@/server/db/connection";

const EVENT = env.eventId;

async function count(db: Db, table: string): Promise<number> {
  const rows = await db.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM ${table} WHERE event_id = $1`,
    [EVENT],
  );
  return Number(rows[0]?.n ?? 0);
}

async function wipeEvent(db: Db): Promise<{ participants: number }> {
  const participants = await count(db, "participants");
  console.log(`event: ${EVENT}`);
  console.log(`participants: ${participants}`);
  console.log(`conversations: ${await count(db, "conversations")}`);
  console.log(`drink_orders: ${await count(db, "drink_orders")}`);
  console.log(`reminders: ${await count(db, "reminders")}`);
  console.log(`song_requests: ${await count(db, "song_requests")}`);

  await db.query(
    `DELETE FROM drink_order_events WHERE order_id IN (SELECT id FROM drink_orders WHERE event_id = $1)`,
    [EVENT],
  );
  for (const table of [
    "mission_events",
    "riddle_solves",
    "participant_missions",
    "drink_orders",
    "reminders",
    "song_requests",
    "operator_alerts",
    "conversations",
    "participants",
    "projection_events",
    "partner_events",
    "counters",
  ]) {
    await db.query(`DELETE FROM ${table} WHERE event_id = $1`, [EVENT]);
  }

  return { participants };
}

async function main(): Promise<void> {
  if (!process.argv.includes("--yes")) {
    console.error("This deletes all guests and run-of-show state for the event in SUPABASE_DB_URL.");
    console.error("Re-run with --yes to confirm.");
    process.exit(1);
  }

  const db = createPgDb(env.databaseUrl);
  const { participants } = await wipeEvent(db);
  console.log(`\n✓ cleared ${participants} participant(s) and related rows for ${EVENT}.`);
  console.log("Board is empty; next projection read defaults to arrival. Waitlist CSV is unchanged.");
  process.exit(0);
}

main().catch((err) => {
  console.error("reset-event failed:", err);
  process.exit(1);
});
