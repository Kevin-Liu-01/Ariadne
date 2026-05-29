import { env, requireAgentphoneApi } from "@/lib/env";
import type {
  AgentResponse,
  PhoneNumberResponse,
  SendMessageResponse,
  WebCallResponse,
  WebhookResponse,
} from "@/server/partners/agentphone/types";

export class AgentphoneError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`AgentPhone API ${status}: ${body.slice(0, 300)}`);
    this.name = "AgentphoneError";
  }
}

/**
 * Thin typed client over the documented AgentPhone REST API
 * (https://docs.agentphone.ai). We hand-roll it (rather than vendor the Fern
 * SDK) so every response shape and error path stays under our control for an
 * event-critical surface. The official `agentphone` SDK + MCP remain valid
 * alternatives; see README.
 */
export class AgentphoneClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new AgentphoneError(res.status, text);
    return (text ? JSON.parse(text) : {}) as T;
  }

  // --- outbound guest messaging (the PRD's open question: POST /v1/messages) ---
  sendMessage(params: {
    agentId: string;
    toNumber: string;
    body: string;
    mediaUrls?: string[];
  }): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>("POST", "/messages", {
      agent_id: params.agentId,
      to_number: params.toNumber,
      body: params.body,
      ...(params.mediaUrls ? { media_urls: params.mediaUrls } : {}),
    });
  }

  sendReaction(messageId: string, reaction: string): Promise<unknown> {
    return this.request("POST", `/messages/${messageId}/reactions`, { reaction });
  }

  sendTyping(conversationId: string): Promise<unknown> {
    return this.request("POST", `/conversations/${conversationId}/typing`, {});
  }

  // --- conversation state mirror (so AgentPhone shows participant + flow) ---
  updateConversationMetadata(
    conversationId: string,
    metadata: Record<string, unknown>,
  ): Promise<unknown> {
    return this.request("PATCH", `/conversations/${conversationId}`, { metadata });
  }

  // --- web voice token (iPad / browser check-in) ---
  createWebCall(params: {
    agentId: string;
    variables?: Record<string, string>;
  }): Promise<WebCallResponse> {
    return this.request<WebCallResponse>("POST", "/calls/web", {
      agentId: params.agentId,
      ...(params.variables ? { variables: params.variables } : {}),
    });
  }

  // --- provisioning (used by scripts/provision.ts) ---
  listAgents(): Promise<{ data: AgentResponse[] }> {
    return this.request("GET", "/agents?limit=100");
  }

  createAgent(params: {
    name: string;
    description?: string;
    voiceMode?: "webhook" | "hosted";
    systemPrompt?: string;
    beginMessage?: string;
  }): Promise<AgentResponse> {
    return this.request<AgentResponse>("POST", "/agents", params);
  }

  updateAgent(agentId: string, params: Record<string, unknown>): Promise<AgentResponse> {
    return this.request<AgentResponse>("PATCH", `/agents/${agentId}`, params);
  }

  createNumber(): Promise<PhoneNumberResponse> {
    return this.request<PhoneNumberResponse>("POST", "/numbers", {});
  }

  attachNumber(agentId: string, numberId: string): Promise<unknown> {
    return this.request("POST", `/agents/${agentId}/numbers`, { numberId });
  }

  createOrUpdateAgentWebhook(
    agentId: string,
    url: string,
    opts?: { contextLimit?: number; timeout?: number },
  ): Promise<WebhookResponse> {
    return this.request<WebhookResponse>("POST", `/agents/${agentId}/webhook`, {
      url,
      ...(opts ?? {}),
    });
  }

  createOrUpdateMasterWebhook(
    url: string,
    opts?: { contextLimit?: number; timeout?: number },
  ): Promise<WebhookResponse> {
    return this.request<WebhookResponse>("POST", "/webhooks", { url, ...(opts ?? {}) });
  }

  testAgentWebhook(agentId: string): Promise<unknown> {
    return this.request("POST", `/agents/${agentId}/webhook/test`, {});
  }

  testMasterWebhook(agentId?: string): Promise<unknown> {
    const q = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
    return this.request("POST", `/webhooks/test${q}`, {});
  }

  getUsage(): Promise<unknown> {
    return this.request("GET", "/usage");
  }
}

const globalRef = globalThis as unknown as { __ariadneAgentphone?: AgentphoneClient };

/** Singleton client bound to env credentials. Throws if the API key is unset. */
export function getAgentphoneClient(): AgentphoneClient {
  if (!globalRef.__ariadneAgentphone) {
    const { apiKey, baseUrl } = requireAgentphoneApi();
    globalRef.__ariadneAgentphone = new AgentphoneClient(apiKey, baseUrl);
  }
  return globalRef.__ariadneAgentphone;
}

/** True when outbound sends should actually hit the network. */
export function outboundEnabled(): boolean {
  return !env.disableOutbound && Boolean(env.agentphone.apiKey) && Boolean(env.agentphone.agentId);
}
