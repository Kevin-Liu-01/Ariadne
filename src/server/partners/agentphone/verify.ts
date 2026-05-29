import { createHmac, timingSafeEqual } from "node:crypto";
import type { AgentphoneWebhookHeaders } from "@/server/partners/agentphone/types";

const REPLAY_WINDOW_SECONDS = 300;

/**
 * Verify an AgentPhone webhook. The signed string is `{timestamp}.{rawBody}`,
 * HMAC-SHA256 with the webhook secret, compared against `sha256=<hex>`. Rejects
 * deliveries older than five minutes to blunt replay attacks.
 */
export function verifyAgentphoneSignature(
  rawBody: string,
  headers: AgentphoneWebhookHeaders,
  secret: string,
): boolean {
  if (!secret || !headers.signature || !headers.timestamp) return false;

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > REPLAY_WINDOW_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${headers.timestamp}.${rawBody}`)
    .digest("hex");
  const expectedHeader = `sha256=${expected}`;

  const a = Buffer.from(expectedHeader);
  const b = Buffer.from(headers.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
