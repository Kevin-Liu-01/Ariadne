import { describe, expect, it } from "vitest";
import type { ChatFn, ChatResponse } from "@/server/partners/dedalus/types";
import { freshBackbone, inbound } from "./helpers";

function content(text: string): ChatResponse {
  return {
    id: "x",
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
  };
}

function toolCall(name: string, args: object): ChatResponse {
  return {
    id: "x",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [
            { id: "tc_1", type: "function", function: { name, arguments: JSON.stringify(args) } },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
  };
}

/**
 * Scripted stand-in for the gateway: routes by the latest user text, then echoes
 * the tool's canonical `say` as the final reply. Proves the runner -> tools ->
 * services -> reply loop without a live model.
 */
const fakeChat: ChatFn = async (req) => {
  const last = req.messages[req.messages.length - 1];
  if (last?.role === "tool") {
    const result = JSON.parse(last.content ?? "{}") as { say?: string };
    return content(result.say ?? "ok");
  }
  const user = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (/lost|stolen|hurt|someone|harass|emergency/i.test(user)) {
    return toolCall("flag_operator", { reason: user });
  }
  if (/\b(i'?m|i am)\b/i.test(user)) {
    const name = user.replace(/.*\b(i'?m|i am)\b\s*/i, "").trim();
    return toolCall("check_in", name ? { name } : {});
  }
  if (/\b(join|check in|hey|hello|hi)\b/i.test(user)) {
    return toolCall("check_in", {});
  }
  if (/^[a-z'-]{2,30}$/i.test(user.trim())) {
    return toolCall("check_in", { name: user.trim() });
  }
  if (/vodka|drink|soda|martini|beer|wine/i.test(user)) {
    return toolCall("order_drink", { text: user });
  }
  return content("tell me more.");
};

describe("conversational agent (mocked model)", () => {
  it("checks a guest in via the check_in tool and relays the canonical reply", async () => {
    const bb = await freshBackbone(fakeChat);
    const reply = await bb.brain.process(inbound("+1700000001", "I'm Zoe"));
    const zoe = await bb.repos.participants.findByPhone("test-event", "+1700000001");
    expect(zoe).toBeTruthy();
    expect(zoe?.displayName).toBe("Zoe");
    expect(reply.participantId).toBe(zoe?.id);
    expect(reply.text.toLowerCase()).toContain("welcome, zoe");
    expect(reply.text).toContain(zoe?.gameId ?? "??");
  });

  it("asks for a name before check-in when none is given", async () => {
    const bb = await freshBackbone(fakeChat);
    const reply = await bb.brain.process(inbound("+1700000005", "hey"));
    expect(await bb.repos.participants.findByPhone("test-event", "+1700000005")).toBeNull();
    expect(reply.text.toLowerCase()).toContain("what should i call you");
  });

  it("threads in after the guest replies with their name", async () => {
    const bb = await freshBackbone(fakeChat);
    await bb.brain.process(inbound("+1700000006", "JOIN"));
    const reply = await bb.brain.process(inbound("+1700000006", "Kevin"));
    const guest = await bb.repos.participants.findByPhone("test-event", "+1700000006");
    expect(guest?.displayName).toBe("Kevin");
    expect(reply.text.toLowerCase()).toContain("welcome, kevin");
  });

  it("routes a drink request through the order_drink tool", async () => {
    const bb = await freshBackbone(fakeChat);
    await bb.brain.process(inbound("+1700000002", "I'm Max"));
    const reply = await bb.brain.process(inbound("+1700000002", "can I get a vodka soda"));
    expect(await bb.drinks.listActive()).toHaveLength(1);
    expect(reply.text.toLowerCase()).toContain("locked");
  });

  it("just chats when no tool applies", async () => {
    const bb = await freshBackbone(fakeChat);
    await bb.brain.process(inbound("+1700000003", "I'm Ivy"));
    const reply = await bb.brain.process(inbound("+1700000003", "what is this place?"));
    expect(reply.text).toBe("tell me more.");
  });

  it("escalates a real-world problem to the operator via flag_operator", async () => {
    const bb = await freshBackbone(fakeChat);
    await bb.brain.process(inbound("+1700000004", "I'm Sam"));
    await bb.brain.process(inbound("+1700000004", "I lost my coat somewhere"));
    expect(await bb.repos.operatorAlerts.listOpen("test-event")).toHaveLength(1);
  });
});
