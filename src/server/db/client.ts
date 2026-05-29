import { env } from "@/lib/env";
import { createDb, type DB } from "@/server/db/connection";

// Memoized across Next HMR reloads so we keep a single connection (and WAL lock).
const globalRef = globalThis as unknown as { __ariadneDb?: DB };

export function getDb(): DB {
  if (!globalRef.__ariadneDb) {
    globalRef.__ariadneDb = createDb(env.dbPath);
  }
  return globalRef.__ariadneDb;
}
