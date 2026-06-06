import { z } from "zod";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import { sendGuestText } from "@/server/partners/agentphone/outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({ body: z.string().trim().min(1).max(600) });

/** Recent announcements for the console history. */
export async function GET(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");
  const bb = getBackbone();
  return json({ announcements: await bb.announcements.listRecent() });
}

/** Broadcast a typed announcement to everyone who has texted the line (checked in or not; paused/STOP excluded). */
export async function POST(req: Request): Promise<Response> {
  if (!bearerOk(req, env.operatorToken)) return problem(401, "unauthorized");

  let parsed: z.infer<typeof PostBody>;
  try {
    parsed = PostBody.parse(await req.json());
  } catch {
    return problem(422, "announcement body is required (1-600 chars)");
  }

  const bb = getBackbone();
  const result = await bb.announcements.broadcast(parsed.body, sendGuestText);
  // Also flash it on the projection board so the whole room sees it, not just phones.
  await bb.projection.emit("announcement.posted", { body: parsed.body });
  return json({
    recipients: result.recipients,
    delivered: result.delivered,
    skippedPaused: result.skippedPaused,
    announcement: result.announcement,
  });
}
