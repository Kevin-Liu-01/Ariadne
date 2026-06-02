import { GEMS } from "@/constants/gems";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { waitlistEntries } from "@/server/door/waitlist";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Door roster for guards: every waitlist entry with its checked-in status. */
export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  const participants = await bb.repos.participants.listByEvent(bb.eventId);
  const byEmail = new Map(participants.filter((p) => p.email).map((p) => [p.email as string, p]));

  const entries = waitlistEntries()
    .map((entry) => {
      const p = byEmail.get(entry.email);
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

  return json({ entries, total: entries.length, checkedIn: byEmail.size });
}
