import type { OperatorDoorEntry } from "@/app/operator/api";

/** Free-text filter over the door roster: match an email, signup name, or game id. */
export function filterDoorEntries(entries: OperatorDoorEntry[], query: string): OperatorDoorEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.email.includes(q) ||
      (e.name ?? "").toLowerCase().includes(q) ||
      (e.gameId ?? "").toLowerCase().includes(q),
  );
}
