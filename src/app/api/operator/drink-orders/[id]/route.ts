import { z } from "zod";
import { DRINK_STATUSES, isCocktailItem } from "@/constants/drinks";
import { drinkExpiredCopy, drinkReadyCopy } from "@/constants/copy";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import { sendToParticipant } from "@/server/partners/agentphone/outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  status: z.enum(DRINK_STATUSES).optional(),
  note: z.string().trim().max(200).optional(),
  menuItemId: z.string().trim().min(1).optional(),
  modifiers: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const { id } = await params;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch {
    return problem(422, "invalid drink update");
  }

  const bb = getBackbone();

  // An item swap takes precedence over a status move; the editor sends one or the other.
  if (body.menuItemId) {
    const edited = await bb.drinks.editItem(id, body.menuItemId, body.modifiers ?? []);
    if (!edited) return problem(404, "order or menu item not found");
    return json(edited);
  }

  if (body.status) {
    const updated = await bb.drinks.updateStatus(id, body.status, body.note ?? null);
    if (!updated) return problem(404, "order not found");
    // Notify when ready (max 3 texts per order) or once when it expires (best-effort).
    if (body.status === "ready") {
      const prefix = `ready:${id}:`;
      const sent = await bb.repos.reminders.countByKindRefPrefix(
        bb.eventId,
        updated.participantId,
        "drink_ready",
        prefix,
      );
      if (sent < 3) {
        const ok = await sendToParticipant(updated.participantId, drinkReadyCopy(updated.label));
        if (ok) {
          await bb.repos.reminders.record(
            bb.eventId,
            updated.participantId,
            "drink_ready",
            `${prefix}${sent + 1}`,
          );
        }
      }
    } else if (body.status === "expired") {
      void sendToParticipant(updated.participantId, drinkExpiredCopy(isCocktailItem(updated.menuItemId)));
    }
    return json(updated);
  }

  return problem(422, "nothing to update");
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const { id } = await params;
  const removed = await getBackbone().drinks.remove(id);
  if (!removed) return problem(404, "order not found");
  return json({ ok: true });
}
