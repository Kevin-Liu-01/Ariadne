import type { ReactNode } from "react";
import { IMessageIcon } from "@/components/imessage-icon";
import { smsHref } from "@/domain/phone";
import { cn } from "@/lib/utils";

/**
 * The iMessage mark plus its label, wired so a tap opens the guest's Messages app
 * to our event number with a prefilled, editable `body`. This is the single place
 * the "tap the green glyph to start a text" affordance lives, so every surface
 * (landing badges, the text-reminder rows) behaves the same.
 *
 * Layout stays with the caller via `className` (inline-flex chip, full-width row,
 * …); this component only owns the icon, the link, the hover/focus affordance, and
 * the fail-closed fallback. When no number is provisioned it renders a plain,
 * non-interactive span so the copy still reads, matching the rest of the UI.
 */
export function IMessageLink({
  phone,
  body,
  iconSize = 20,
  className,
  children,
}: {
  phone: string;
  body: string;
  iconSize?: number;
  className?: string;
  children: ReactNode;
}) {
  const href = smsHref(phone, body);
  const content = (
    <>
      <IMessageIcon size={iconSize} />
      {children}
    </>
  );

  if (!href) {
    return <span className={className}>{content}</span>;
  }

  return (
    <a
      href={href}
      className={cn(
        "transition-colors hover:text-helio focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-helio/50 focus-visible:ring-offset-2 focus-visible:ring-offset-nyx",
        className,
      )}
    >
      {content}
    </a>
  );
}
