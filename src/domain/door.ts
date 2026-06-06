/**
 * Door roster matching. Check-in records only a first name (no email), so the
 * operator's "expected vs arrived" roster lines a waitlist row up with a checked-in
 * guest by first name. Matching is greedy and one-to-one: each arrival claims at
 * most one waitlist row, so a single "Aaron" lights up one Aaron, not every Aaron.
 */

/** First whitespace-delimited token of a name, lowercased; "" when empty. */
export function firstNameKey(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

/**
 * For each waitlist name, the index of the arrival that matches it on first name,
 * or -1 if none. An arrival is matched to at most one waitlist row.
 */
export function matchRosterByName(
  waitlistNames: (string | null)[],
  arrivalNames: (string | null)[],
): number[] {
  const buckets = new Map<string, number[]>();
  arrivalNames.forEach((name, index) => {
    const key = firstNameKey(name);
    if (!key) return;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(index);
    else buckets.set(key, [index]);
  });

  const used = new Set<number>();
  return waitlistNames.map((name) => {
    const bucket = buckets.get(firstNameKey(name));
    const hit = bucket?.find((index) => !used.has(index));
    if (hit === undefined) return -1;
    used.add(hit);
    return hit;
  });
}
