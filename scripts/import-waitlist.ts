/**
 * Convert a guest-export CSV into the door waitlist (src/server/door/waitlist.csv).
 * Pulls the email + name for every row that has an email, lowercases + dedupes.
 *
 * Usage: pnpm exec tsx scripts/import-waitlist.ts <guest-export.csv>
 *
 * Assumes the export's column order: Name is column 0, email is column 3
 * ("What is your email?..."). Those first columns never contain commas, so a
 * plain split is safe; commas only appear in later free-text fields we ignore.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const NAME_COL = 0;
const EMAIL_COL = 3;

function main(): void {
  const src = process.argv[2];
  if (!src) {
    console.error("usage: pnpm exec tsx scripts/import-waitlist.ts <guest-export.csv>");
    process.exit(1);
  }

  const lines = readFileSync(src, "utf8").split(/\r?\n/);
  const out: string[] = ["email,name"];
  const seen = new Set<string>();
  let noEmail = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = line.split(",");
    const email = (cols[EMAIL_COL] ?? "").trim().toLowerCase();
    const name = (cols[NAME_COL] ?? "").trim().replace(/,/g, " ");
    if (!email.includes("@")) {
      noEmail += 1;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(`${email},${name}`);
  }

  const dest = join(process.cwd(), "src/server/door/waitlist.csv");
  writeFileSync(dest, `${out.join("\n")}\n`, "utf8");
  console.log(`wrote ${seen.size} emails to src/server/door/waitlist.csv (skipped ${noEmail} rows with no email, e.g. plus-ones)`);
}

main();
