import { ArrowRight, MonitorPlay } from "lucide-react";
import Link from "next/link";
import { DEFAULT_HOME_MODE, type HomeMode } from "@/constants/event";
import { IMessageIcon } from "@/components/imessage-icon";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay, smsHref } from "@/domain/phone";

/**
 * Primary "check in" call to action. In the default `imessage` mode it leads with
 * the iMessage mark (the phone-first path) and a green logo bloom; in `play` mode,
 * which staff flip on from the operator console, it leads guests to the web Live
 * Player at /play/live with a helio screen mark instead. Both share the same
 * bespoke chrome: a lit top edge, a hover sheen sweep, and an arrow chip.
 */
const CTA_CLASS =
  "group relative flex w-full items-center gap-4 overflow-hidden border border-helio/40 bg-gradient-to-br from-helio/20 via-helio/10 to-transparent px-5 py-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-helio/70 hover:from-helio/30 hover:via-helio/15 hover:shadow-[0_22px_50px_-22px_rgba(210,190,255,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-helio/60 focus-visible:ring-offset-2 focus-visible:ring-offset-nyx sm:py-5";

export function JoinCta({
  href,
  label,
  note,
  className,
  mode = DEFAULT_HOME_MODE,
}: {
  href?: string;
  label?: string;
  note?: string;
  className?: string;
  mode?: HomeMode;
}) {
  const phone = env.agentphone.phoneNumber;
  const isPlay = mode === "play";
  const destination = href ?? (isPlay ? "/play/live" : (smsHref(phone, "JOIN") ?? "/join"));
  const displayLabel = label ?? (isPlay ? "Play on this screen" : phone ? formatPhoneDisplay(phone) : "Join");
  const noteText = note ?? (isPlay ? "tap in, no texting needed" : "text in for your first mission");
  const isSms = destination.startsWith("sms:");

  const body = (
    <>
      {/* Lit glassy top edge. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cloud/30 to-transparent"
        aria-hidden
      />
      {/* Sheen that sweeps across on hover. */}
      <span
        className="pointer-events-none absolute inset-y-0 left-[-60%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-cloud/15 to-transparent transition-[left] duration-700 ease-out group-hover:left-[130%]"
        aria-hidden
      />

      {/* The check-in mark: iMessage glyph (green bloom) or a screen mark (helio bloom) for play. */}
      <span className="relative flex shrink-0 items-center justify-center">
        {isPlay ? (
          <>
            <span
              className="absolute -inset-1 rounded-2xl bg-helio/25 blur-md transition-all duration-300 group-hover:bg-helio/45 group-hover:blur-lg"
              aria-hidden
            />
            <MonitorPlay
              size={46}
              className="relative text-helio drop-shadow-[0_3px_10px_rgba(210,190,255,0.4)] transition-transform duration-300 group-hover:scale-[1.06]"
              strokeWidth={1.5}
              aria-hidden
            />
          </>
        ) : (
          <>
            <span
              className="absolute -inset-1 rounded-2xl bg-[#2fd64a]/25 blur-md transition-all duration-300 group-hover:bg-[#2fd64a]/45 group-hover:blur-lg"
              aria-hidden
            />
            <IMessageIcon
              size={46}
              className="relative drop-shadow-[0_3px_10px_rgba(25,209,60,0.4)] transition-transform duration-300 group-hover:scale-[1.06]"
            />
          </>
        )}
      </span>

      <span className="relative flex-1 text-left">
        <span
          className={cn(
            "block text-2xl font-semibold leading-tight text-cloud",
            isSms && "tabular-nums tracking-[0.1em]",
          )}
        >
          {displayLabel}
        </span>
        <span className="mt-0.5 block text-[11px] uppercase tracking-[0.3em] text-helio">{noteText}</span>
      </span>

      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-helio/40 bg-nyx/40 text-helio transition-all duration-300 group-hover:border-helio group-hover:bg-helio group-hover:text-nyx">
        <ArrowRight
          className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden
        />
      </span>
    </>
  );

  if (isSms) {
    return (
      <a href={destination} className={cn(CTA_CLASS, className)}>
        {body}
      </a>
    );
  }

  return (
    <Link href={destination} className={cn(CTA_CLASS, className)}>
      {body}
    </Link>
  );
}
