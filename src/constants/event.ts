/** Event-level brand + protocol constants. Tunable content lives in constants/. */

export const PRODUCT_NAME = "Ariadne";
/** Saved-contact display name (vCard FN) so the guest's phone shows "Ariadne Agent", not a raw number or the org. */
export const CONTACT_NAME = "Ariadne Agent";
export const PRODUCT_TAGLINE = "your personal agent for the night";
export const EVENT_NAME = "Run(way)time";
export const VENUE = "Lume Studios";

/** Inbound transports AgentPhone can deliver. SMS/iMessage are primary; voice is the premium path. */
export const INBOUND_CHANNELS = ["sms", "mms", "imessage", "voice"] as const;
export type InboundChannel = (typeof INBOUND_CHANNELS)[number];

/** Conversation flow the guest is currently in. Steers the intent router. */
export const FLOWS = {
  CHECKIN: "checkin",
  MISSION: "mission",
  DRINK: "drink",
  IDLE: "idle",
} as const;
export type Flow = (typeof FLOWS)[keyof typeof FLOWS];

/** Keep SMS replies inside one comfortable segment unless the guest asks for help. */
export const SMS_SOFT_LIMIT = 320;

/** Hard ceiling: one phone maps to one active participant unless an operator splits/merges. */
export const ONE_NUMBER_ONE_PARTICIPANT = true;
