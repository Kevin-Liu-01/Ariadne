import { FLOWS, type Flow } from "@/constants/event";
import { parseDrink } from "@/domain/drink-parse";
import { containsPhrase, normalize } from "@/domain/text";

export type Intent =
  | { type: "checkin"; name: string | null }
  | { type: "drink_order"; rawText: string }
  | { type: "mission_answer"; rawText: string }
  | { type: "help" }
  | { type: "status" }
  | { type: "unknown" };

export interface IntentContext {
  isParticipant: boolean;
  currentFlow: Flow;
  hasActiveMission: boolean;
}

const HELP_WORDS = ["help", "menu", "commands", "instructions"];
const STATUS_WORDS = ["mission", "status", "score", "rank", "my move", "whats next", "next move"];
const JOIN_WORDS = ["join", "start", "checkin", "check in", "here", "hi", "hello", "hey", "yo"];

/**
 * Deterministic intent router. Non-participants always go to check-in first.
 * For participants: help and confident drink mentions win even mid-mission, then
 * status, then mission answers, then lower-confidence drink mentions.
 */
export function classifyIntent(text: string, ctx: IntentContext): Intent {
  const n = normalize(text);
  if (n.length === 0) return { type: "unknown" };

  if (!ctx.isParticipant) return { type: "checkin", name: extractName(text) };

  if (matchAny(n, HELP_WORDS)) return { type: "help" };

  const drink = parseDrink(text);
  if (drink.item && drink.confidence >= 0.8) return { type: "drink_order", rawText: text };

  if (matchAny(n, STATUS_WORDS)) return { type: "status" };

  if (ctx.hasActiveMission || ctx.currentFlow === FLOWS.MISSION) {
    return { type: "mission_answer", rawText: text };
  }

  if (drink.item && drink.confidence >= 0.6) return { type: "drink_order", rawText: text };

  return { type: "unknown" };
}

function matchAny(normalized: string, words: readonly string[]): boolean {
  return words.some((w) => containsPhrase(normalized, w));
}

/** Best-effort name extraction for check-in; conservative to avoid naming people "vodka soda". */
export function extractName(text: string): string | null {
  const explicit = text.match(
    /(?:my name is|i am|i'm|this is|name:?)\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+)?)/i,
  );
  if (explicit?.[1]) return titleCase(explicit[1]);

  const tokens = normalize(text).split(" ").filter(Boolean);
  if (tokens.length >= 1 && tokens.length <= 2) {
    const joined = tokens.join(" ");
    if (matchAny(joined, JOIN_WORDS) || matchAny(joined, HELP_WORDS)) return null;
    if (parseDrink(text).item) return null;
    return titleCase(joined);
  }
  return null;
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
