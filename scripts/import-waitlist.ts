/**
 * Convert a guest-export CSV into the door waitlist (src/server/door/waitlist.csv).
 * Pulls the email + name for every row that has an email, lowercases + dedupes.
 *
 * Usage: pnpm exec tsx scripts/import-waitlist.ts <guest-export.csv>
 *
 * Column order in the Partiful-style export: Name (0), Status (1), Checked in (2),
 * RSVP date (3), email (4). We parse quote-aware so a stray comma in a later
 * free-text field (company, comment, ...) never shifts the columns we read.
 * Rows with no email (plus-ones) are skipped: the door roster is keyed by email.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const NAME_COL = 0;
const EMAIL_COL = 4;

/** Split one CSV line, honoring double-quoted fields that contain commas. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

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
    const cols = parseCsvLine(line);
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
  console.log(
    `wrote ${seen.size} emails to src/server/door/waitlist.csv (skipped ${noEmail} rows with no email, e.g. plus-ones)`,
  );
}

main();
