import { GEMS } from "@/constants/gems";
import { matchRosterByName } from "@/domain/door";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { waitlistEntries } from "@/server/door/waitlist";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Door roster for guards: every expected guest with their checked-in status. Since
 * check-in records only a first name, an arrival is matched to a waitlist row by
 * first name (one arrival per row).
 */
export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  const participants = await bb.repos.participants.listByEvent(bb.eventId);
  const waitlist = waitlistEntries();
  const matched = matchRosterByName(
    waitlist.map((entry) => entry.name),
    participants.map((p) => p.displayName),
  );

  const entries = waitlist
    .map((entry, i) => {
      const p = matched[i] >= 0 ? participants[matched[i]] : null;
      return {
        email: entry.email,
        name: entry.name,
        checkedIn: Boolean(p),
        gameId: p?.gameId ?? null,
        displayName: p?.displayName ?? null,
        gemLabel: p ? GEMS[p.gem].label : null,
      };
    })
    .sort((a, b) => Number(b.checkedIn) - Number(a.checkedIn) || a.email.localeCompare(b.email));

  return json({ entries, total: entries.length, checkedIn: entries.filter((e) => e.checkedIn).length });
}
