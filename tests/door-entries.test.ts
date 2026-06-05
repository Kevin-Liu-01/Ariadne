import { describe, expect, it } from "vitest";
import type { OperatorDoorEntry } from "@/app/operator/api";
import { filterDoorEntries } from "@/app/operator/door-entries";

const ENTRIES: OperatorDoorEntry[] = [
  { email: "demo@dedaluslabs.ai", name: "Demo Guest", checkedIn: true, gameId: "A1B2", displayName: "Demo", gemLabel: "Garnet" },
  { email: "windsor@dedaluslabs.ai", name: "Windsor Nguyen", checkedIn: false, gameId: null, displayName: null, gemLabel: null },
  { email: "nameless@nope.com", name: null, checkedIn: false, gameId: null, displayName: null, gemLabel: null },
];

describe("filterDoorEntries", () => {
  it("returns every entry when the query is blank or whitespace", () => {
    expect(filterDoorEntries(ENTRIES, "")).toEqual(ENTRIES);
    expect(filterDoorEntries(ENTRIES, "   ")).toEqual(ENTRIES);
  });

  it("matches on email case-insensitively", () => {
    const hit = filterDoorEntries(ENTRIES, "  WINDSOR ");
    expect(hit).toHaveLength(1);
    expect(hit[0]?.email).toBe("windsor@dedaluslabs.ai");
  });

  it("matches on signup name and tolerates a missing name", () => {
    expect(filterDoorEntries(ENTRIES, "nguyen")).toHaveLength(1);
    expect(filterDoorEntries(ENTRIES, "nguyen")[0]?.name).toBe("Windsor Nguyen");
  });

  it("matches on game id for checked-in guests", () => {
    const hit = filterDoorEntries(ENTRIES, "a1b2");
    expect(hit).toHaveLength(1);
    expect(hit[0]?.checkedIn).toBe(true);
  });

  it("returns nothing when there is no match", () => {
    expect(filterDoorEntries(ENTRIES, "stranger")).toEqual([]);
  });
});
