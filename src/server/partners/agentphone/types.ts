/** Subset of the AgentPhone wire types we read. `data` shape varies by channel. */

export type AgentphoneEvent = "agent.message" | "agent.call_ended" | "agent.reaction";

export interface AgentphoneHistoryItem {
  content: string;
  direction: "inbound" | "outbound";
  channel?: string;
  at?: string;
}

export interface AgentphoneWebhookBody {
  event: AgentphoneEvent;
  channel: "sms" | "mms" | "imessage" | "voice";
  timestamp: string;
  agentId: string;
  data: Record<string, unknown>;
  conversationState?: Record<string, unknown> | null;
  recentHistory?: AgentphoneHistoryItem[];
}

export interface AgentphoneWebhookHeaders {
  signature: string | null;
  timestamp: string | null;
  id: string | null;
  event: string | null;
}

export interface SendMessageResponse {
  id?: string;
  conversationId?: string;
  status?: string;
}

export interface AgentResponse {
  id: string;
  name: string;
  voiceMode?: string;
  systemPrompt?: string | null;
  numbers?: { id: string; phoneNumber?: string }[];
}

export interface PhoneNumberResponse {
  id: string;
  phoneNumber: string;
  status?: string;
  type?: string;
}

export interface WebhookResponse {
  id: string;
  url: string;
  secret: string;
  status?: string;
}
