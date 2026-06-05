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
 * Send the guest reply, attaching the saveable vCard when appropriate.
 *
 * Two ways the card rides along:
 *  - First contact: attach it to the opening bubble (intro copy + reply) so iMessage
 *    renders the contact above the text. CLAIMED atomically before dispatch so racing
 *    inbound messages cannot double-post onboarding; on failure we release and fall
 *    back to text-only.
 *  - `forceContactCard`: the guest explicitly asked for the contact, so attach the
 *    card to this reply even after the one-time send already fired. We mark the claim
 *    on success so the automatic first-contact path never adds a second card.
 */
export async function deliverGuestReply(
  toNumber: string,
  conversationId: string,
  replyText: string,
  opts?: { forceContactCard?: boolean },
): Promise<void> {
  if (!outboundEnabled()) return;

  const mediaUrl = contactCardMediaUrl();
  if (!mediaUrl) {
    console.warn("[ariadne] contact card skipped: AGENTPHONE_PHONE_NUMBER is unset");
    await sendGuestText(toNumber, replyText);
    return;
  }

  const repo = getBackbone().repos.conversations;

  if (opts?.forceContactCard) {
    const sent = await sendGuestText(toNumber, replyText, { mediaUrls: [mediaUrl] });
    if (sent) await repo.claimContactCardSend(conversationId);
    else await sendGuestText(toNumber, replyText);
    return;
  }

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
