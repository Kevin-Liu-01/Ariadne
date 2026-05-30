import { z } from "zod";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import type { ProjectionEventType } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("scene"), scene: z.string().trim().min(1).max(40) }),
  z.object({ action: z.literal("eliminate"), gameId: z.string().trim().min(1) }),
  z.object({ action: z.literal("restore"), gameId: z.string().trim().min(1) }),
  z.object({
    action: z.literal("emit"),
    type: z.string().trim().min(1),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
]);

export async function POST(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return problem(422, "invalid projection command");
  }

  const bb = getBackbone();

  switch (body.action) {
    case "scene":
      return json(await bb.projection.emit("scene.changed", { scene: body.scene }));
    case "eliminate":
    case "restore": {
      const p = await bb.repos.participants.findByGameId(bb.eventId, body.gameId);
      if (!p) return problem(404, "participant not found");
      const eliminated = body.action === "eliminate";
      await bb.repos.participants.setEliminated(p.id, eliminated);
      return json(
        await bb.projection.emit(
          eliminated ? "participant.eliminated" : "participant.restored",
          { gameId: p.gameId },
        ),
      );
    }
    case "emit":
      return json(await bb.projection.emit(body.type as ProjectionEventType, body.data ?? {}));
  }
}
