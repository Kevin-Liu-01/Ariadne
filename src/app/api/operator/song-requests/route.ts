import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { guestRefsById } from "@/server/http/operator-views";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All song requests for the DJ screen (newest first). */
export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  const all = await bb.repos.songRequests.listByEvent(bb.eventId, 100);
  // One batched lookup for every requester on screen, not a findById per request.
  const ids = [...new Set(all.map((s) => s.participantId))];
  const guests = guestRefsById(await bb.repos.participants.findByIds(ids));
  return json({
    requests: all.map((s) => ({
      id: s.id,
      rawText: s.rawText,
      status: s.status,
      createdAt: s.createdAt,
      guest: guests.get(s.participantId) ?? null,
    })),
  });
}
