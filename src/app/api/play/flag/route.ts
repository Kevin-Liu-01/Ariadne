import { z } from "zod";
import { getBackbone } from "@/server/backbone";
import { requirePlayer } from "@/server/play/require-player";
import { json, problem } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ reason: z.string().trim().min(1).max(280) });

/** Raise a host/operator alert from the Live Player ("need a human?"). */
export async function POST(req: Request): Promise<Response> {
  const participantId = requirePlayer(req);
  if (!participantId) return problem(401, "unauthorized");
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return problem(422, "invalid request");
  }
  const result = await getBackbone().player.flag(participantId, body.reason);
  if (!result) return problem(404, "participant not found");
  return json(result);
}
