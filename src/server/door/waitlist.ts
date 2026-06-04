import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeEmail } from "@/domain/email";
import { env } from "@/lib/env";

/** One approved signup from the static waitlist CSV. */
export interface WaitlistEntry {
  email: string;
  name: string | null;
}

// Parsed once per process. The CSV is committed (src/server/door/waitlist.csv) and
// bundled via next.config outputFileTracingIncludes so it ships to the serverless fn.
let cache: Map<string, WaitlistEntry> | null = null;
let testOverride: Map<string, WaitlistEntry> | null = null;

/** Tests inject a deterministic list so they never depend on the live event CSV. */
export function setWaitlistForTests(entries: WaitlistEntry[] | null): void {
  testOverride = entries ? new Map(entries.map((e) => [normalizeEmail(e.email), e])) : null;
}

function load(): Map<string, WaitlistEntry> {
  if (testOverride) return testOverride;
  if (cache) return cache;
  const map = new Map<string, WaitlistEntry>();
  let text = "";
  try {
    text = readFileSync(join(process.cwd(), "src/server/door/waitlist.csv"), "utf8");
  } catch {
    text = "";
  }
  for (const line of text.split(/\r?\n/)) {
    const row = line.trim();
    if (!row || row.startsWith("#") || row.toLowerCase().startsWith("email,")) continue;
    const comma = row.indexOf(",");
    const rawEmail = comma === -1 ? row : row.slice(0, comma);
    const email = normalizeEmail(rawEmail);
    if (!email.includes("@")) continue;
    const name = comma === -1 ? "" : row.slice(comma + 1).trim();
    map.set(email, { email, name: name || null });
  }
  cache = map;
  return map;
}

/** Whether an email is on the approved list, plus the signup name if we have one. */
export function waitlistLookup(email: string): { onList: boolean; name: string | null } {
  if (env.testMode) return { onList: true, name: null };
  const entry = load().get(normalizeEmail(email));
  return { onList: Boolean(entry), name: entry?.name ?? null };
}

/** All approved entries, for the guard door screen. */
export function waitlistEntries(): WaitlistEntry[] {
  return [...load().values()];
}
