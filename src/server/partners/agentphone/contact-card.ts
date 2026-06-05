import { contactCardIntroCopy } from "@/constants/contact-card";
import { env } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { getAgentphoneClient, outboundEnabled } from "@/server/partners/agentphone/client";
import { sendGuestText } from "@/server/partners/agentphone/outbound";

/** HTTPS URL AgentPhone fetches and delivers as a saveable contact attachment. */
export function contactCardMediaUrl(): string | null {
  if (!env.agentphone.phoneNumber) return null;
  return `${env.publicBaseUrl.replace(/\/$/, "")}/ariadne.vcf`;
}

/** First outbound bubble: intro copy plus the brain reply, with the vCard attached. */
export function firstContactMessageBody(replyText: string): string {
  return `${contactCardIntroCopy()}\n\n${replyText}`;
}

/**
 * Send the guest reply. On the first turn for a conversation, attach the vCard in
 * the same outbound message so iMessage renders the contact card above the text.
 * The send is CLAIMED atomically before dispatch so racing inbound messages cannot
 * double-post onboarding. On failure we release the claim and fall back to text-only.
 */
export async function deliverGuestReply(
  toNumber: string,
  conversationId: string,
  replyText: string,
): Promise<void> {
  if (!outboundEnabled()) return;

  const mediaUrl = contactCardMediaUrl();
  if (!mediaUrl) {
    console.warn("[ariadne] contact card skipped: AGENTPHONE_PHONE_NUMBER is unset");
    await sendGuestText(toNumber, replyText);
    return;
  }

  const repo = getBackbone().repos.conversations;
  const firstContact = await repo.claimContactCardSend(conversationId);

  if (!firstContact) {
    await sendGuestText(toNumber, replyText);
    return;
  }

  try {
    await getAgentphoneClient().sendMessage({
      agentId: env.agentphone.agentId,
      toNumber,
      body: firstContactMessageBody(replyText),
      mediaUrls: [mediaUrl],
    });
  } catch (err) {
    console.error("[ariadne] first-contact send failed", err);
    await repo.releaseContactCardSend(conversationId);
    await sendGuestText(toNumber, replyText);
  }
}
