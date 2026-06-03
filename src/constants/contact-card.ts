import { EVENT_NAME, PRODUCT_NAME } from "@/constants/event";

/** Sent with the vCard attachment on the guest's first outbound message. */
export function contactCardIntroCopy(): string {
  return `Save ${PRODUCT_NAME} to your contacts so you know it's me for ${EVENT_NAME}. Then we can keep going here.`;
}
