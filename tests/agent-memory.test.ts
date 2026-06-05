import { beforeAll, describe, expect, it } from "vitest";
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

/** Same routing as the main agent test: email -> check_in, drink words -> order_drink. */
const fakeChat: ChatFn = async (req) => {
  const last = req.messages[req.messages.length - 1];
  if (last?.role === "tool") {
    const result = JSON.parse(last.content ?? "{}") as { say?: string };
    return content(result.say ?? "ok");
  }
  const user = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const email = user.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  if (email) return toolCall("check_in", { email: email[0] });
  if (/drink|beer|wine|mule|machina|modelo|stella|claw|fizz|margar|red bull/i.test(user)) {
    return toolCall("order_drink", { text: user });
  }
  return content("tell me more.");
};

describe("conversation memory + deferred intent", () => {
  it("remembers a drink asked for before check-in and places it once after YES", async () => {
    const bb = await freshBackbone(fakeChat);
    const phone = "+1700000020";

    // 1) Asks for a beer before checking in: nothing is ordered, the intent is remembered.
    await bb.brain.process(inbound(phone, "can I get a modelo"));
    expect(await bb.repos.participants.findByPhone("test-event", phone)).toBeNull();
    let conv = await bb.repos.conversations.findByPhone("test-event", phone);
    expect(conv?.pendingIntent).toMatchObject({ kind: "drink", status: "captured" });
    expect(await bb.drinks.listActive()).toHaveLength(0);

    // 2) Checks in: the reply confirms check-in AND offers the remembered beer (not ordered yet).
    const checkin = await bb.brain.process(inbound(phone, "demo@dedaluslabs.ai"));
    expect(checkin.text.toLowerCase()).toContain("checked in");
    expect(checkin.text.toLowerCase()).toContain("modelo");
    expect(await bb.drinks.listActive()).toHaveLength(0);
    conv = await bb.repos.conversations.findByPhone("test-event", phone);
    expect(conv?.pendingIntent?.status).toBe("offered");

    // 3) Says YES: the beer is placed exactly once and the intent is cleared.
    const yes = await bb.brain.process(inbound(phone, "yes"));
    expect(yes.text.toLowerCase()).toMatch(/modelo|order received/);
    expect(await bb.drinks.listActive()).toHaveLength(1);
    conv = await bb.repos.conversations.findByPhone("test-event", phone);
    expect(conv?.pendingIntent).toBeNull();
  });

  it("drops the deferred drink when the guest declines after check-in", async () => {
    const bb = await freshBackbone(fakeChat);
    const phone = "+1700000021";
    await bb.brain.process(inbound(phone, "can I get a stella"));
    await bb.brain.process(inbound(phone, "demo@dedaluslabs.ai"));
    const no = await bb.brain.process(inbound(phone, "no"));
    expect(await bb.drinks.listActive()).toHaveLength(0);
    const conv = await bb.repos.conversations.findByPhone("test-event", phone);
    expect(conv?.pendingIntent).toBeNull();
    expect(no.text.toLowerCase()).toMatch(/no problem|maybe later/);
  });

  it("does not double-order the same drink within the dedup window", async () => {
    const bb = await freshBackbone(fakeChat);
    const phone = "+1700000022";
    await bb.brain.process(inbound(phone, "demo@dedaluslabs.ai"));
    expect(await bb.repos.participants.findByPhone("test-event", phone)).toBeTruthy();

    await bb.brain.process(inbound(phone, "machina mule"));
    expect(await bb.drinks.listActive()).toHaveLength(1);

    const second = await bb.brain.process(inbound(phone, "machina mule"));
    expect(await bb.drinks.listActive()).toHaveLength(1); // no duplicate
    expect(second.text.toLowerCase()).toMatch(/already/);
  });

  it("persists inbound and outbound turns and feeds them back as history", async () => {
    const seen: string[][] = [];
    const recordingChat: ChatFn = async (req) => {
      seen.push(req.messages.map((m) => (typeof m.content === "string" ? m.content : "")));
      return content("noted.");
    };
    const bb = await freshBackbone(recordingChat);
    const phone = "+1700000023";

    await bb.brain.process(inbound(phone, "first message"));
    await bb.brain.process(inbound(phone, "second message"));

    // The second turn's prompt must carry the first turn (both directions) from the local log.
    const lastPrompt = seen[seen.length - 1] ?? [];
    expect(lastPrompt).toContain("first message");
    expect(lastPrompt).toContain("noted.");
    expect(lastPrompt).toContain("second message");

    const conv = await bb.repos.conversations.findByPhone("test-event", phone);
    const history = await bb.repos.messages.recentByConversation(conv?.id ?? "", 10);
    expect(history).toEqual([
      { content: "first message", direction: "inbound" },
      { content: "noted.", direction: "outbound" },
      { content: "second message", direction: "inbound" },
      { content: "noted.", direction: "outbound" },
    ]);
  });
});
