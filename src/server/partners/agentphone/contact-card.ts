import { contactCardIntroCopy } from "@/constants/contact-card";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { getAgentphoneClient, outboundEnabled } from "@/server/partners/agentphone/client";

/** HTTPS URL AgentPhone fetches and delivers as a saveable contact attachment. */
export function contactCardMediaUrl(): string | null {
  if (!env.agentphone.phoneNumber) return null;
  return `${env.publicBaseUrl.replace(/\/$/, "")}/ariadne.vcf`;
}

/** Send the vCard once per conversation so the line shows as Ariadne, not a raw number. */
export async function ensureContactCard(toNumber: string, conversationId: string): Promise<void> {
  if (!outboundEnabled()) return;
  const mediaUrl = contactCardMediaUrl();
  if (!mediaUrl) return;

  const conv = await getBackbone().repos.conversations.findById(conversationId);
  if (!conv || conv.contactCardSent) return;

  try {
    await getAgentphoneClient().sendMessage({
      agentId: env.agentphone.agentId,
      toNumber,
      body: contactCardIntroCopy(),
      mediaUrls: [mediaUrl],
    });
    await getBackbone().repos.conversations.markContactCardSent(conversationId);
  } catch (err) {
    console.error("[ariadne] contact card send failed", err);
  }
}
