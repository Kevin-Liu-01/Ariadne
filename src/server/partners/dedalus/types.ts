/** OpenAI-compatible chat-completion shapes (the subset Ariadne's brain uses). */

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  tool_choice?: "auto" | "none" | "required";
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  choices: { index: number; message: ChatMessage; finish_reason: string }[];
}

/** The single seam the agent runner depends on. Real impl hits the gateway; tests inject a fake. */
export type ChatFn = (req: ChatRequest) => Promise<ChatResponse>;
