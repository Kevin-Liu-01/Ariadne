/**
 * The things a guest can text Ariadne once they are in. Rendered with the iMessage
 * mark as quick reminders across the user-facing surfaces (landing, join, play).
 * Order is the order guests meet them through the night.
 */

export interface TextableAction {
  /** Short, lowercase verb phrase, e.g. "ask for drinks". */
  readonly label: string;
}

export const TEXTABLE_ACTIONS: readonly TextableAction[] = [
  { label: "ask for drinks" },
  { label: "request songs" },
  { label: "answer missions" },
  { label: "get help anytime" },
] as const;
