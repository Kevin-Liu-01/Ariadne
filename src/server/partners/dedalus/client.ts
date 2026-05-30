import { requireDedalusApi } from "@/lib/env";
import type { ChatFn, ChatRequest, ChatResponse } from "@/server/partners/dedalus/types";

export class DedalusError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Dedalus gateway ${status}: ${body.slice(0, 300)}`);
    this.name = "DedalusError";
  }
}

/**
 * Thin client over the OpenAI-compatible Dedalus gateway
 * (https://api.dedaluslabs.ai/v1/chat/completions). Hand-rolled for the same
 * reason as the AgentPhone client: full control of the error path on an
 * event-critical surface, and trivially mockable in tests.
 */
export class DedalusClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });
    const text = await res.text();
    if (!res.ok) throw new DedalusError(res.status, text);
    return JSON.parse(text) as ChatResponse;
  }
}

const globalRef = globalThis as unknown as { __ariadneDedalus?: DedalusClient };

/** A ChatFn bound to env credentials, built lazily on first use (key not needed at construction). */
export function getDedalusChat(): ChatFn {
  return (req) => {
    if (!globalRef.__ariadneDedalus) {
      const { apiKey, baseUrl } = requireDedalusApi();
      globalRef.__ariadneDedalus = new DedalusClient(apiKey, baseUrl);
    }
    return globalRef.__ariadneDedalus.chat(req);
  };
}
