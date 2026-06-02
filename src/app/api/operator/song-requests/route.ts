import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import type { SongRequest } from "@/server/db/repositories/song-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function withGuest(bb: ReturnType<typeof getBackbone>, request: SongRequest) {
  const p = await bb.repos.participants.findById(request.participantId);
  return {
    id: request.id,
    rawText: request.rawText,
    status: request.status,
    createdAt: request.createdAt,
    guest: p ? { gameId: p.gameId, displayName: p.displayName } : null,
  };
}

/** All song requests for the DJ screen (newest first). */
export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  const all = await bb.repos.songRequests.listByEvent(bb.eventId, 100);
  return json({ requests: await Promise.all(all.map((s) => withGuest(bb, s))) });
}
