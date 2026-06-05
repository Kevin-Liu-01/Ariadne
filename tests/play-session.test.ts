import { afterEach, describe, expect, it } from "vitest";
import { signPlayerToken, verifyPlayerToken } from "@/server/play/session";

/**
 * The player token is the web Live Player's whole identity, so it must round-trip
 * exactly, reject tampering, and fail closed when no secret is configured (the same
 * rule the webhook signature follows).
 */
const SECRET_KEYS = [
  "ARIADNE_PLAYER_SECRET",
  "ARIADNE_OPERATOR_TOKEN",
  "AGENTPHONE_WEBHOOK_SECRET",
] as const;

const saved = new Map<string, string | undefined>();
function clearSecrets() {
  for (const k of SECRET_KEYS) {
    saved.set(k, process.env[k]);
    delete process.env[k];
  }
}

afterEach(() => {
  for (const [k, v] of saved) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  saved.clear();
});

describe("player session token", () => {
  it("round-trips a participant id", () => {
    clearSecrets();
    process.env.ARIADNE_PLAYER_SECRET = "s3cret";
    const token = signPlayerToken("par_abc123");
    expect(verifyPlayerToken(token)).toBe("par_abc123");
  });

  it("rejects a tampered signature or swapped participant id", () => {
    clearSecrets();
    process.env.ARIADNE_PLAYER_SECRET = "s3cret";
    const token = signPlayerToken("par_abc123");
    expect(verifyPlayerToken(`${token}x`)).toBeNull();
    const [, iat, sig] = token.split(".");
    // The signature is bound to the id, so reusing it under another id must fail.
    expect(verifyPlayerToken(`par_evil.${iat}.${sig}`)).toBeNull();
    expect(verifyPlayerToken("garbage")).toBeNull();
  });

  it("fails closed when no secret is configured", () => {
    clearSecrets();
    process.env.ARIADNE_PLAYER_SECRET = "s3cret";
    const token = signPlayerToken("par_abc123");
    // Drop every secret the resolver could fall back to.
    delete process.env.ARIADNE_PLAYER_SECRET;
    expect(verifyPlayerToken(token)).toBeNull();
  });

  it("falls back to the operator token when no dedicated secret is set", () => {
    clearSecrets();
    process.env.ARIADNE_OPERATOR_TOKEN = "op-token";
    const token = signPlayerToken("par_xyz");
    expect(verifyPlayerToken(token)).toBe("par_xyz");
  });
});
