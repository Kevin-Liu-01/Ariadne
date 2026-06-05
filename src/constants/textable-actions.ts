/**
 * The things a guest can text Ariadne once they are in. Rendered with the iMessage
 * mark as quick reminders across the user-facing surfaces (landing, join, play).
 * Order is the order guests meet them through the night.
 *
 * Each action carries the message `body` we prefill into the guest's Messages app
 * when they tap the mark (see {@link smsHref} and the `IMessageLink` component):
 * a ready-to-send starter they can edit, so any "what you can text" affordance is
 * one tap from an open thread.
 */

export interface TextableAction {
  /** Stable key so bespoke surfaces can pull a single action's body without re-typing it. */
  readonly id: string;
  /** Short, lowercase verb phrase, e.g. "ask for drinks". */
  readonly label: string;
  /** Prefilled, editable message opened in Messages when the mark is tapped. */
  readonly body: string;
}

export const TEXTABLE_ACTIONS = [
  { id: "drinks", label: "ask for drinks", body: "I want to order a " },
  { id: "songs", label: "request songs", body: "I want to request " },
  { id: "missions", label: "answer missions", body: "My mission answer is " },
  { id: "help", label: "get help anytime", body: "I need help with " },
] as const satisfies readonly TextableAction[];

export type TextableActionId = (typeof TEXTABLE_ACTIONS)[number]["id"];

const ACTION_BY_ID: ReadonlyMap<TextableActionId, TextableAction> = new Map(
  TEXTABLE_ACTIONS.map((a) => [a.id, a]),
);

/** Look up one canonical action (label + prefilled body) by id. Throws on an unknown id. */
export function textableAction(id: TextableActionId): TextableAction {
  const action = ACTION_BY_ID.get(id);
  if (!action) throw new Error(`unknown textable action: ${id}`);
  return action;
}
