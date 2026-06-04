import { z } from "zod";
import { PUZZLES } from "@/constants/puzzles";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import { sendGuestText } from "@/server/partners/agentphone/outbound";
import type { ProjectionEventType } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Scene changes text the room synchronously, so allow time beyond the default cap.
export const maxDuration = 60;

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("scene"), scene: z.string().trim().min(1).max(40) }),
  z.object({ action: z.literal("puzzle"), step: z.enum(["next", "prev"]) }),
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
    case "scene": {
      // Only announce when the scene actually changes, so re-picking the same
      // scene never re-texts the room.
      const changed = body.scene !== (await bb.projection.scene());
      const ev = await bb.projection.emit("scene.changed", { scene: body.scene });
      if (changed) await bb.announcements.broadcastScene(body.scene, sendGuestText);
      return json(ev);
    }
    case "puzzle": {
      const currentId = await bb.projection.currentPuzzleId();
      const at = PUZZLES.findIndex((p) => p.id === currentId);
      const delta = body.step === "next" ? 1 : -1;
      const nextIdx = ((at < 0 ? 0 : at) + delta + PUZZLES.length) % PUZZLES.length;
      const piece = PUZZLES[nextIdx];
      // imageUrl is public-safe; it lets the board update on its next poll without a full reload.
      await bb.projection.emit("puzzle.changed", { puzzleId: piece.id, imageUrl: piece.imageUrl ?? null });
      // Operator-trusted summary: label is fine here, never on the public board.
      return json({ puzzleId: piece.id, label: piece.label, index: nextIdx + 1, total: PUZZLES.length });
    }
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
