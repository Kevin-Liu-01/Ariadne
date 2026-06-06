import { IMessageIcon } from "@/components/imessage-icon";
import { formatPhoneDisplay } from "@/domain/phone";
import { cn } from "@/lib/utils";

const ICON_SIZE = { sm: 22, md: 28, xl: 52 } as const;

/** AgentPhone line for projection headers: iMessage mark + formatted number. */
export function TextAgentNumber({
  phone,
  className,
  size = "md",
}: {
  phone: string;
  className?: string;
  size?: "sm" | "md" | "xl";
}) {
  const display = formatPhoneDisplay(phone);
  if (!display) return null;

  return (
    <div
      className={cn(
        "flex items-center border-l border-nyx-line",
        size === "sm" && "gap-2 pl-3",
        size === "md" && "gap-2.5 pl-4",
        size === "xl" && "gap-4 pl-6",
        className,
      )}
    >
      <IMessageIcon size={ICON_SIZE[size]} />
      <p
        className={cn(
          "font-display tabular-nums tracking-wide text-cloud",
          size === "sm" && "text-lg",
          size === "md" && "text-xl sm:text-2xl",
          size === "xl" && "text-5xl sm:text-6xl",
        )}
      >
        {display}
      </p>
    </div>
  );
}
