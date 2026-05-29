import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyAgentphoneSignature } from "@/server/partners/agentphone/verify";

const SECRET = "whsec_test_secret";

function sign(body: string, ts: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")}`;
}

describe("verifyAgentphoneSignature", () => {
  const body = JSON.stringify({ event: "agent.message" });
  const ts = String(Math.floor(Date.now() / 1000));

  it("accepts a valid signature", () => {
    const headers = { signature: sign(body, ts), timestamp: ts, id: "wh_1", event: "agent.message" };
    expect(verifyAgentphoneSignature(body, headers, SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const headers = { signature: sign(body, ts), timestamp: ts, id: "wh_1", event: "agent.message" };
    expect(verifyAgentphoneSignature(`${body} tampered`, headers, SECRET)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const headers = { signature: sign(body, ts, "other"), timestamp: ts, id: "wh_1", event: "x" };
    expect(verifyAgentphoneSignature(body, headers, SECRET)).toBe(false);
  });

  it("rejects a stale timestamp (replay)", () => {
    const old = String(Math.floor(Date.now() / 1000) - 1000);
    const headers = { signature: sign(body, old), timestamp: old, id: "wh_1", event: "x" };
    expect(verifyAgentphoneSignature(body, headers, SECRET)).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(
      verifyAgentphoneSignature(body, { signature: null, timestamp: null, id: null, event: null }, SECRET),
    ).toBe(false);
  });
});
