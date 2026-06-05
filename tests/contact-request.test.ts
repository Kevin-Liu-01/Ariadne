import { describe, expect, it } from "vitest";
import { isContactCardRequest } from "@/domain/contact-request";

describe("isContactCardRequest", () => {
  it("matches the explicit asks guests actually send", () => {
    // Drawn from the live AgentPhone transcript for the event line.
    for (const text of [
      "Send me ur contact",
      "Send ur contact",
      "What's your contact info",
      "What’s ur contact?",
      "send me your contact card",
      "can I get your number",
      "what's your number",
      "share your contact",
      "drop your digits",
      "save your contact",
      "vcard please",
      "send the v-card",
      "contact card",
    ]) {
      expect(isContactCardRequest(text), text).toBe(true);
    }
  });

  it("ignores messages that merely mention contact without asking for ours", () => {
    for (const text of [
      "I lost my contact lens",
      "how do I contact a host",
      "can you contact the DJ for me",
      "what's the number for the bar",
      "my contacts are syncing",
      "hi",
      "DRINK Modelo",
      "what am i",
      "",
      "   ",
    ]) {
      expect(isContactCardRequest(text), text).toBe(false);
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isContactCardRequest("  SEND ME YOUR CONTACT  ")).toBe(true);
    expect(isContactCardRequest("Your Contact Info")).toBe(true);
  });
});
