import { TEXTABLE_ACTIONS } from "@/constants/textable-actions";
import { IMessageLink } from "@/components/imessage-link";
import { cn } from "@/lib/utils";

/**
 * The "what you can text" reminder list: each action prefixed with the iMessage
 * mark. Shared across landing, join, and play so the textable actions read the same
 * everywhere. Each row is tappable: it opens Messages to `phone` with that
 * action's starter text prefilled. Pass `title` for the small eyebrow above the rows.
 */
export function TextReminders({
  phone,
  className,
  title = "text Ariadne to",
  iconSize = 20,
}: {
  phone: string;
  className?: string;
  title?: string;
  iconSize?: number;
}) {
  return (
    <div className={cn("text-left", className)}>
      {title ? (
        <p className="text-[11px] uppercase tracking-[0.25em] text-helio">{title}</p>
      ) : null}
      <ul className={cn("divide-y divide-nyx-line/60", title && "mt-2")}>
        {TEXTABLE_ACTIONS.map((action) => (
          <li key={action.id}>
            <IMessageLink
              phone={phone}
              body={action.body}
              iconSize={iconSize}
              className="flex w-full items-center gap-3 py-2.5 text-sm text-cloud"
            >
              {action.label}
            </IMessageLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
