import { beforeAll, describe, expect, it } from "vitest";
import { helpCopy } from "@/constants/copy";
import type { ChatFn, ChatResponse } from "@/server/partners/dedalus/types";
import { setWaitlistForTests } from "@/server/door/waitlist";
import { freshBackbone, inbound } from "./helpers";

beforeAll(() => {
  setWaitlistForTests([{ email: "demo@dedaluslabs.ai", name: "Demo Guest" }]);
});

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
  const email = user.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  if (email) return toolCall("check_in", { email: email[0] });
  if (/drink|beer|wine|mule|machina|modelo|stella|claw|fizz|margar|red bull/i.test(user)) {
    return toolCall("order_drink", { text: user });
  }
  if (/\b(join|check in|hey|hello|hi)\b/i.test(user)) {
    return toolCall("check_in", {});
  }
  return content("tell me more.");
};

// Pre-check-in via the service (which does not gate) for tests whose subject is a
// later action, not the door. demo@dedaluslabs.ai is on the test waitlist CSV.
async function seed(bb: Awaited<ReturnType<typeof freshBackbone>>, phone: string, name: string): Promise<void> {
  const { participant, conversation } = await bb.registration.register({
    phone,
    externalConversationId: `conv_${phone}`,
    channel: "sms",
    name,
    email: `${name.toLowerCase()}@dedaluslabs.ai`,
  });
  await bb.repos.conversations.setGameUnlocked(conversation.id, true);
  await bb.missions.unlockGameplay(participant, conversation);
  await bb.projection.emit("scene.changed", { scene: "color" });
}

describe("conversational agent (mocked model)", () => {
  it("threads a guest in when they give a waitlisted email", async () => {
    const bb = await freshBackbone(fakeChat);
    const reply = await bb.brain.process(inbound("+1700000001", "demo@dedaluslabs.ai"));
    const guest = await bb.repos.participants.findByPhone("test-event", "+1700000001");
    expect(guest).toBeTruthy();
    expect(guest?.email).toBe("demo@dedaluslabs.ai");
    expect(guest?.displayName).toBe("Demo Guest"); // pulled from the waitlist
    expect(reply.participantId).toBe(guest?.id);
    expect(reply.text.toLowerCase()).toMatch(/checked in|venue code/);
    expect(reply.text).toContain(guest?.gameId ?? "??");
  });

  it("refuses an email that is not on the list and checks no one in", async () => {
    const bb = await freshBackbone(fakeChat);
    const reply = await bb.brain.process(inbound("+1700000009", "stranger@nope.com"));
    expect(await bb.repos.participants.findByPhone("test-event", "+1700000009")).toBeNull();
    expect(reply.text.toLowerCase()).toContain("not on tonight");
  });

  it("asks for the signup email before checking anyone in", async () => {
    const bb = await freshBackbone(fakeChat);
    const reply = await bb.brain.process(inbound("+1700000005", "hey"));
    expect(await bb.repos.participants.findByPhone("test-event", "+1700000005")).toBeNull();
    expect(reply.text.toLowerCase()).toMatch(/first name|what is your name/);
  });

  it("routes a drink request through the order_drink tool", async () => {
    const bb = await freshBackbone(fakeChat);
    await seed(bb, "+1700000002", "Max");
    const reply = await bb.brain.process(inbound("+1700000002", "can I get a machina mule"));
    expect(await bb.drinks.listActive()).toHaveLength(1);
    expect(reply.text.toLowerCase()).toMatch(/machina|order received/);
  });

  it("just chats when no tool applies", async () => {
    const bb = await freshBackbone(fakeChat);
    await seed(bb, "+1700000003", "Ivy");
    const reply = await bb.brain.process(inbound("+1700000003", "what is this place?"));
    expect(reply.text).toBe("tell me more.");
  });

  it("returns status copy on STATUS without a model call", async () => {
    const bb = await freshBackbone(async () => content("should not run"));
    await seed(bb, "+1700000012", "Pat");
    const reply = await bb.brain.process(inbound("+1700000012", "STATUS"));
    expect(reply.text).toContain("Quests");
    expect(reply.text).toContain("Game ID");
    expect(reply.text.toLowerCase()).not.toContain("should not run");
  });

  it("returns help copy on HELP without leaking model meta", async () => {
    const leakyChat: ChatFn = async (req) => {
      if (req.tool_choice === "none") {
        return content(
          "You're Ariadne, personal agent, but the user asked HELP. Tools used: help. Now respond in-character.",
        );
      }
      return toolCall("help", {});
    };
    const bb = await freshBackbone(leakyChat);
    await seed(bb, "+1700000010", "Val");
    const reply = await bb.brain.process(inbound("+1700000010", "help"));
    expect(reply.text).toBe(helpCopy());
    expect(reply.text.toLowerCase()).not.toContain("tools used");
  });

  it("delivers help copy after help tool even when the model would meta-reply", async () => {
    const leakyChat: ChatFn = async (req) => {
      if (req.tool_choice === "none") {
        return content("Tools used: help. Now respond in-character.");
      }
      const user = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
      if (/what can i do/i.test(user)) return toolCall("help", {});
      return content("hm");
    };
    const bb = await freshBackbone(leakyChat);
    await seed(bb, "+1700000011", "Ren");
    const reply = await bb.brain.process(inbound("+1700000011", "what can I do?"));
    expect(reply.text).toBe(helpCopy());
    expect(reply.text.toLowerCase()).not.toContain("in-character");
  });

  it("submits a host request after the guest describes their issue", async () => {
    const bb = await freshBackbone(fakeChat);
    await seed(bb, "+1700000004", "Sam");
    await bb.brain.process(inbound("+1700000004", "I lost my coat somewhere"));
    await bb.brain.process(inbound("+1700000004", "yes"));
    await bb.brain.process(
      inbound("+1700000004", "My black coat is missing from the check area by the bar"),
    );
    const alerts = await bb.repos.operatorAlerts.listOpen("test-event");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.reason).toContain("coat");
  });
});
