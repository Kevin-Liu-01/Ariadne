import { contactCardIntroCopy } from "@/constants/contact-card";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { getAgentphoneClient, outboundEnabled } from "@/server/partners/agentphone/client";

/** HTTPS URL AgentPhone fetches and delivers as a saveable contact attachment. */
export function contactCardMediaUrl(): string | null {
  if (!env.agentphone.phoneNumber) return null;
  return `${env.publicBaseUrl.replace(/\/$/, "")}/ariadne.vcf`;
}

/**
 * Send the vCard + intro exactly once per conversation so the line shows as Ariadne, not a
 * raw number. The send is CLAIMED atomically before dispatch, so two inbound messages racing
 * through `deliver` can never both send it (the bug that doubled the onboarding messages). On
 * a transient send failure we release the claim so the next message retries.
 */
export async function ensureContactCard(toNumber: string, conversationId: string): Promise<void> {
  if (!outboundEnabled()) return;
  const mediaUrl = contactCardMediaUrl();
  if (!mediaUrl) return;

  const repo = getBackbone().repos.conversations;
  if (!(await repo.claimContactCardSend(conversationId))) return;

  try {
    await getAgentphoneClient().sendMessage({
      agentId: env.agentphone.agentId,
      toNumber,
      body: contactCardIntroCopy(),
      mediaUrls: [mediaUrl],
    });
  } catch (err) {
    console.error("[ariadne] contact card send failed", err);
    await repo.releaseContactCardSend(conversationId);
  }
}
