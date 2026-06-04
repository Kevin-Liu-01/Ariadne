import { describe, expect, it } from "vitest";
import { summarizeHostIssue } from "@/server/agent/host-issue";

describe("summarizeHostIssue", () => {
  it("leads with a category for triage", () => {
    expect(summarizeHostIssue("I lost my black coat near the bar")).toMatch(/^Lost item:/);
    expect(summarizeHostIssue("my friend feels really sick and dizzy")).toMatch(/^Medical:/);
    expect(summarizeHostIssue("someone is harassing me by the stairs")).toMatch(/^Safety:/);
  });

  it("keeps only the first sentence of detail", () => {
    const summary = summarizeHostIssue("I lost my coat. It is a black North Face. Please help.");
    expect(summary).toBe("Lost item: I lost my coat.");
  });

  it("condenses long rambling to a capped line", () => {
    const long = `I am so confused ${"and lost ".repeat(40)}right now`;
    const summary = summarizeHostIssue(long);
    expect(summary.length).toBeLessThanOrEqual(160);
    expect(summary.endsWith("...")).toBe(true);
  });

  it("does not echo an empty message", () => {
    expect(summarizeHostIssue("   ")).toBe("Host request (no details given).");
  });

  it("falls back to plain detail when no category matches", () => {
    expect(summarizeHostIssue("Where can I charge my phone?")).toBe("Where can I charge my phone?");
  });
});
