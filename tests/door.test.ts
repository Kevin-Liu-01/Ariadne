import { describe, expect, it } from "vitest";
import { extractEmail, normalizeEmail } from "@/domain/email";
import { waitlistLookup } from "@/server/door/waitlist";

describe("waitlist door gate", () => {
  it("matches a listed email case-insensitively and returns the signup name", () => {
    const hit = waitlistLookup("  DEMO@Dedaluslabs.AI ");
    expect(hit.onList).toBe(true);
    expect(hit.name).toBe("Demo Guest");
  });

  it("rejects an email that is not on the list", () => {
    expect(waitlistLookup("stranger@nope.com").onList).toBe(false);
  });

  it("pulls an email out of a free-text message", () => {
    expect(extractEmail("hey it's demo@dedaluslabs.ai i think")).toBe("demo@dedaluslabs.ai");
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});
