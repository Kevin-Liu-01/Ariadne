/**
 * Condense a guest's free-text problem into one triage line for the host
 * dashboard. We lead with a detected category so a host can prioritize at a
 * glance (medical before a lost coat), then keep the first sentence of detail.
 * This is a deterministic summary, not the raw message echoed back.
 */

// Leading word-boundary + stem (no trailing boundary) so inflections match too:
// "harass" catches harassing/harassed, "injur" catches injured/injury, etc.
const CATEGORIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(hurt|injur|sick|unwell|faint|dizzy|allerg|medical|emergenc|bleed|seizure|nause)/i, "Medical"],
  [/\b(harass|creep|uncomfortable|unwanted|threat|unsafe|follow)/i, "Safety"],
  [/\b(lost my friend|lost my group|my group|separated|can'?t find my friend)/i, "Lost guest"],
  [/\b(lost|missing|can'?t find|left my|drop|stolen|misplac)/i, "Lost item"],
  [/\b(wheelchair|accessib|mobility|hearing|vision|ramp|elevator)/i, "Accessibility"],
  [/\b(refund|rude|complain|unfair|broken|overcharg|wrong charge)/i, "Complaint"],
];

const MAX_DETAIL = 140;

function categorize(text: string): string | null {
  for (const [pattern, label] of CATEGORIES) {
    if (pattern.test(text)) return label;
  }
  return null;
}

/** First sentence (or the whole line) trimmed to a dashboard-friendly length. */
function firstSentence(text: string): string {
  const sentence = text.split(/(?<=[.!?])\s+/u)[0]?.trim() || text;
  if (sentence.length <= MAX_DETAIL) return sentence;
  return `${sentence.slice(0, MAX_DETAIL - 3).trimEnd()}...`;
}

export function summarizeHostIssue(raw: string): string {
  const line = raw.replace(/\s+/gu, " ").trim();
  if (!line) return "Host request (no details given).";
  const category = categorize(line);
  const detail = firstSentence(line);
  return category ? `${category}: ${detail}` : detail;
}
