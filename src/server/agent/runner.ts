import { menuSummary } from "@/constants/drinks";
import { ARIADNE_LORE } from "@/constants/lore";
import type { InboundChannel } from "@/constants/event";
import { ARIADNE_SYSTEM_PROMPT } from "@/constants/prompts";
import { AGENT_TOOL_DEFS, executeTool, type ToolContext } from "@/server/agent/tools";
import type { ChatFn, ChatMessage } from "@/server/partners/dedalus/types";

export interface AgentInput {
  from: string;
  externalConversationId: string | null;
  channel: InboundChannel;
  text: string;
  recentHistory: { content: string; direction: "inbound" | "outbound" }[];
  /** Grounded "CURRENT GUEST: ..." block computed by the brain. */
  grounding: string;
}

type ToolBase = Omit<ToolContext, "from" | "externalConversationId" | "channel" | "userText">;

/** Tools whose `say` is complete guest copy; skip a second model pass that leaks meta-instructions. */
const DIRECT_SAY_TOOLS = new Set(["help", "get_status"]);

function directSayFromResults(results: Record<string, unknown>[]): string | null {
  if (results.length === 0 || results.some((r) => r.error)) return null;
  const lines = results
    .map((r) => (typeof r.say === "string" ? r.say.trim() : ""))
    .filter((s) => s.length > 0);
  if (lines.length !== results.length) return null;
  if (new Set(lines).size !== 1) return null;
  return lines[0] ?? null;
}

/**
 * The conversational brain: an LLM tool-calling loop over the Dedalus gateway.
 * The model routes (chooses tools) and chats; the tools run deterministic
 * services. `chat` is injected so tests can drive it with a scripted model.
 */
export class AgentRunner {
  constructor(
    private readonly toolBase: ToolBase,
    private readonly chat: ChatFn,
    private readonly model: string,
    private readonly maxSteps: number,
  ) {}

  async run(input: AgentInput): Promise<string> {
    const ctx: ToolContext = {
      ...this.toolBase,
      from: input.from,
      externalConversationId: input.externalConversationId,
      channel: input.channel,
      userText: input.text,
    };

    const system = [
      ARIADNE_SYSTEM_PROMPT,
      `BAR MENU (recommend only from this; pass the guest's chosen item to order_drink):\n${menuSummary()}`,
      ARIADNE_LORE,
      input.grounding,
    ].join("\n\n");
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...input.recentHistory.slice(-10).map(
        (h): ChatMessage => ({
          role: h.direction === "inbound" ? "user" : "assistant",
          content: h.content,
        }),
      ),
      { role: "user", content: input.text },
    ];

    for (let step = 0; step < this.maxSteps; step += 1) {
      const res = await this.chat({
        model: this.model,
        messages,
        tools: AGENT_TOOL_DEFS,
        tool_choice: "auto",
      });
      const msg = res.choices[0]?.message;
      if (!msg) break;
      messages.push(msg);

      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) {
        const text = (msg.content ?? "").trim();
        if (text) return text;
        break;
      }

      const stepResults: Record<string, unknown>[] = [];
      for (const call of calls) {
        let result: Record<string, unknown>;
        try {
          const args = call.function.arguments
            ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
            : {};
          if (process.env.ARIADNE_DEBUG) {
            console.error(`[tool] ${call.function.name} ${call.function.arguments}`);
          }
          result = await executeTool(call.function.name, args, ctx);
        } catch {
          result = { error: "tool_execution_failed" };
        }
        stepResults.push(result);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }

      const allDirect = calls.every((c) => DIRECT_SAY_TOOLS.has(c.function.name));
      if (allDirect) {
        const reply = directSayFromResults(stepResults);
        if (reply) return reply;
      }
    }

    // Tool budget spent (or empty reply): force one final spoken line.
    const final = await this.chat({ model: this.model, messages, tool_choice: "none" });
    return (final.choices[0]?.message.content ?? "").trim() || "Give me one sec, text me again.";
  }
}
