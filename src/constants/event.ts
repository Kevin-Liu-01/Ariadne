/** Event-level brand + protocol constants. Tunable content lives in constants/. */

export const PRODUCT_NAME = "Ariadne";
/** Saved-contact name as vCard N first/last, so the guest's phone stores a real
 *  person card: first name "Ariadne", last name "Agent". */
export const CONTACT_FIRST_NAME = "Ariadne";
export const CONTACT_LAST_NAME = "Agent";
/** Saved-contact display name (vCard FN), derived so it never drifts from first/last. */
export const CONTACT_NAME = `${CONTACT_FIRST_NAME} ${CONTACT_LAST_NAME}`;
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

/**
 * Default check-in surface the home page leads with. Staff flip this live from the
 * operator console: `imessage` shows the text-in number (the phone-first default);
 * `play` leads guests straight to the web Live Player at /play/live instead.
 */
export const HOME_MODES = ["imessage", "play"] as const;
export type HomeMode = (typeof HOME_MODES)[number];
export const DEFAULT_HOME_MODE: HomeMode = "imessage";

/** Keep SMS replies inside one comfortable segment unless the guest asks for help. */
export const SMS_SOFT_LIMIT = 320;

/** Hard ceiling: one phone maps to one active participant unless an operator splits/merges. */
export const ONE_NUMBER_ONE_PARTICIPANT = true;
