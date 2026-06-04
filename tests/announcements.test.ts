import { describe, expect, it } from "vitest";
import type { Backbone } from "@/server/backbone";
import { freshBackbone } from "./helpers";

const EVENT = "test-event";

async function checkIn(bb: Backbone, phone: string, name: string): Promise<void> {
  await bb.registration.register({ phone, externalConversationId: `conv_${phone}`, channel: "sms", name });
}

describe("AnnouncementService.broadcast", () => {
  it("texts every checked-in guest and logs the send", async () => {
    const bb = await freshBackbone();
    await checkIn(bb, "+1000000001", "Aria");
    await checkIn(bb, "+1000000002", "Bell");

    const sent: { phone: string; text: string }[] = [];
    const result = await bb.announcements.broadcast("Showcase starts in 5", async (phone, text) => {
      sent.push({ phone, text });
      return true;
    });

    expect(result.recipients).toBe(2);
    expect(result.delivered).toBe(2);
    expect(sent.map((s) => s.phone).sort()).toEqual(["+1000000001", "+1000000002"]);
    // Guests see it framed as a venue notice, not a personal reply.
    expect(sent[0].text).toContain("announcement:");
    expect(sent[0].text).toContain("Showcase starts in 5");

    const recent = await bb.announcements.listRecent();
    expect(recent).toHaveLength(1);
    expect(recent[0].body).toBe("Showcase starts in 5");
    expect(recent[0].delivered).toBe(2);
  });

  it("skips guests who paused texts", async () => {
    const bb = await freshBackbone();
    await checkIn(bb, "+1000000001", "Aria");
    await checkIn(bb, "+1000000002", "Bell");
    const paused = await bb.repos.conversations.findByPhone(EVENT, "+1000000002");
    await bb.repos.conversations.setTextsPaused(paused!.id, true);

    const sent: string[] = [];
    const result = await bb.announcements.broadcast("Last call", async (phone) => {
      sent.push(phone);
      return true;
    });

    expect(result.recipients).toBe(1);
    expect(result.skippedPaused).toBe(1);
    expect(sent).toEqual(["+1000000001"]);
  });

  it("counts only delivered sends", async () => {
    const bb = await freshBackbone();
    await checkIn(bb, "+1000000001", "Aria");
    await checkIn(bb, "+1000000002", "Bell");

    const result = await bb.announcements.broadcast("Heads up", async (phone) => phone.endsWith("1"));
    expect(result.recipients).toBe(2);
    expect(result.delivered).toBe(1);
  });
});
