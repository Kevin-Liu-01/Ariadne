import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { getAgentphoneClient, outboundEnabled } from "@/server/partners/agentphone/client";

/** HTTPS image AgentPhone fetches and delivers as the guest's first bubble. */
export function welcomeImageMediaUrl(): string {
  return env.welcomeImageUrl;
}

/**
 * Send the brand image once per conversation, before the first text reply, so a
 * new guest sees Run(time)way before any words. Best-effort: if outbound is
 * constrained the room keeps running, and a transient failure leaves the flag
 * unset so the next message retries.
 */
export async function ensureWelcomeImage(toNumber: string, conversationId: string): Promise<void> {
  if (!outboundEnabled()) return;

  const conv = await getBackbone().repos.conversations.findById(conversationId);
  if (!conv || conv.welcomeImageSent) return;

  try {
    await getAgentphoneClient().sendMessage({
      agentId: env.agentphone.agentId,
      toNumber,
      body: "",
      mediaUrls: [welcomeImageMediaUrl()],
    });
    await getBackbone().repos.conversations.markWelcomeImageSent(conversationId);
  } catch (err) {
    console.error("[ariadne] welcome image send failed", err);
  }
}
