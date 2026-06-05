/** Core domain types. Repositories map Postgres rows to/from these shapes. */

import type { DrinkStatus } from "@/constants/drinks";
import type { InboundChannel, Flow } from "@/constants/event";
import type { GemId } from "@/constants/gems";
import type { ParticipantMissionStatus } from "@/constants/missions";

export interface Participant {
  id: string;
  eventId: string;
  gameId: string; // public, textable short code
  displayName: string | null;
  phone: string | null;
  email: string | null; // the waitlist email they checked in with
  gem: GemId;
  secretWord: string;
  stationId: string | null;
  score: number;
  eliminated: boolean;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Host-request flow: offer -> guest sends issue -> alert on dashboard. */
export type HostRequestState = "offered" | "awaiting_issue";

/**
 * A request a guest made before they were eligible for it (e.g. a drink ordered
 * before check-in). Captured verbatim, surfaced once check-in completes
 * ("captured" -> "offered"), then cleared on the guest's reply. One slot per
 * conversation so it can never double-fire.
 */
export type PendingIntentKind = "drink" | "song";
export type PendingIntentStatus = "captured" | "offered";
export interface PendingIntent {
  kind: PendingIntentKind;
  text: string;
  status: PendingIntentStatus;
}

export interface Conversation {
  id: string;
  eventId: string;
  participantId: string | null;
  externalId: string | null; // AgentPhone conversationId
  phone: string | null;
  channel: InboundChannel | null;
  currentFlow: Flow;
  currentMissionId: string | null;
  contactCardSent: boolean;
  welcomeImageSent: boolean;
  /** Guest asked to pause texts; no operator alerts. */
  textsPaused: boolean;
  hostRequestState: HostRequestState | null;
  pendingIntent: PendingIntent | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageDirection = "inbound" | "outbound";

/** One persisted conversational turn: a guest message or an Ariadne reply. */
export interface Message {
  id: string;
  eventId: string;
  conversationId: string;
  participantId: string | null;
  direction: MessageDirection;
  channel: InboundChannel | null;
  body: string;
  createdAt: string;
}

export interface DrinkOrder {
  id: string;
  eventId: string;
  participantId: string;
  conversationId: string | null;
  rawText: string;
  menuItemId: string;
  label: string;
  modifiers: string[];
  status: DrinkStatus;
  operatorNotes: string | null;
  createdAt: string;
  readyAt: string | null;
  pickedUpAt: string | null;
}

export interface ParticipantMission {
  id: string;
  eventId: string;
  participantId: string;
  missionId: string;
  status: ParticipantMissionStatus;
  pointsAwarded: number;
  assignedAt: string;
  submittedAt: string | null;
  completedAt: string | null;
}

export type MissionResult = "correct" | "incorrect" | "invalid";

export interface MissionEvent {
  id: string;
  eventId: string;
  participantId: string;
  missionId: string;
  rawAnswer: string;
  normalizedAnswer: string;
  partnerGameIds: string[];
  result: MissionResult;
  pointsAwarded: number;
  createdAt: string;
}

export interface PartnerEvent {
  id: string;
  eventId: string;
  provider: "agentphone";
  webhookId: string;
  eventType: string;
  channel: string | null;
  payload: string; // raw JSON
  status: "received" | "processed" | "error";
  createdAt: string;
}

export type ProjectionEventType =
  | "participant.checked_in"
  | "participant.messaged"
  | "mission.completed"
  | "score.updated"
  | "participant.eliminated"
  | "participant.restored"
  | "drink_order.milestone"
  | "scene.changed"
  | "puzzle.changed"
  | "announcement.posted"
  | "home_mode.changed"
  | "fuser_asset.added";

export interface ProjectionEvent {
  seq: number;
  eventId: string;
  type: ProjectionEventType;
  data: Record<string, unknown>;
  createdAt: string;
}

/** Normalized inbound partner event. Everything mutating state derives from this. */
export interface InteractionEvent {
  provider: "agentphone";
  webhookId: string;
  channel: InboundChannel;
  externalConversationId: string | null;
  from: string; // guest phone / web session / voice caller id
  to: string | null; // our number
  text: string; // message body or voice transcript
  mediaUrls: string[];
  receivedAt: string;
  recentHistory: { content: string; direction: "inbound" | "outbound" }[];
  conversationState: Record<string, unknown> | null;
}
