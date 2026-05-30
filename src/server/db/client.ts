import { requireDatabaseUrl } from "@/lib/env";
import type { Db } from "@/server/db/connection";
import { createPgDb } from "@/server/db/pg";

// Memoized across HMR reloads and warm serverless invocations so we reuse one
// connection pool instead of exhausting the Supabase pooler.
const globalRef = globalThis as unknown as { __ariadneDb?: Db };

/** The process-wide Postgres handle (Supabase pooler in prod). */
export function getDb(): Db {
  if (!globalRef.__ariadneDb) {
    globalRef.__ariadneDb = createPgDb(requireDatabaseUrl());
  }
  return globalRef.__ariadneDb;
}
