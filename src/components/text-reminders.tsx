import { TEXTABLE_ACTIONS } from "@/constants/textable-actions";
import { IMessageIcon } from "@/components/imessage-icon";
import { cn } from "@/lib/utils";

/**
 * The "what you can text" reminder list: each action prefixed with the iMessage
 * mark. Shared across landing, join, and play so the textable actions read the same
 * everywhere. Pass `title` for the small eyebrow above the rows.
 */
export function TextReminders({
  className,
  title = "text Ariadne to",
  iconSize = 20,
}: {
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
          <li key={action.label} className="flex items-center gap-3 py-2.5">
            <IMessageIcon size={iconSize} />
            <span className="text-sm text-cloud">{action.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
