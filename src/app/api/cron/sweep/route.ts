import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { bearerOk } from "@/server/http/auth";
import { json, problem } from "@/server/http/respond";
import { sendGuestText } from "@/server/partners/agentphone/outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The sweep may send a batch of texts; give it room beyond the default cap.
export const maxDuration = 60;

/**
 * Proactive reminder sweep. A scheduler (Vercel Cron or any pinger) hits this every
 * minute with the CRON_SECRET. It scene-broadcasts, nudges idle players, and chases
 * missing names and unconfirmed pickups, then logs each send so it never spams.
 */
async function sweep(req: Request): Promise<Response> {
  if (!bearerOk(req, env.cronSecret)) return problem(401, "unauthorized");
  // Outbound off (dev, or unregistered 10DLC): nothing to do, never log phantom sends.
  if (env.disableOutbound) return json({ skipped: "outbound_disabled" });
  const summary = await getBackbone().reminders.run(sendGuestText);
  return json(summary);
}

// Vercel Cron issues a GET; allow POST too for manual/external pingers.
export const GET = sweep;
export const POST = sweep;
