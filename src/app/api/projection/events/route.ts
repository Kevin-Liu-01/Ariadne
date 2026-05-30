import { getBackbone } from "@/server/backbone";
import { json } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Incremental projection events strictly after `?since=<seq>`. The board polls
 * this on a short interval; Postgres is the source of truth, so a missed poll
 * is recovered on the next one (and by the periodic full-state heal).
 */
export async function GET(req: Request): Promise<Response> {
  const raw = Number(new URL(req.url).searchParams.get("since"));
  const since = Number.isFinite(raw) && raw > 0 ? raw : 0;
  const events = await getBackbone().projection.eventsSince(since);
  return json({ events });
}
