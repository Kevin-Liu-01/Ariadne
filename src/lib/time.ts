/** ISO-8601 timestamp. Single source so every row sorts and diffs the same way. */
export function now(): string {
  return new Date().toISOString();
}
