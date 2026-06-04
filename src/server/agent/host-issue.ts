/** One-line host-dashboard summary from the guest's issue message. */

export function summarizeHostIssue(raw: string): string {
  const line = raw.replace(/\s+/gu, " ").trim();
  if (!line) return "Guest requested a host (no details).";
  if (line.length <= 200) return line;
  return `${line.slice(0, 197)}...`;
}
