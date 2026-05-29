/** Core domain types. Repositories map SQLite rows to/from these shapes. */

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
  gem: GemId;
  secretWord: string;
  stationId: string | null;
  score: number;
  eliminated: boolean;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  | "mission.completed"
  | "score.updated"
  | "participant.eliminated"
  | "participant.restored"
  | "drink_order.milestone"
  | "scene.changed"
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
