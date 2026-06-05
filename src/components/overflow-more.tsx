import { cn } from "@/lib/utils";

type OverflowVariant = "pill" | "tile";

/**
 * Trailing "+N more" affordance for a list of people capped with `capForDisplay`.
 * Renders nothing when nothing is hidden, so callers can drop it in unconditionally.
 *
 * `pill` matches the inline name/gem chips of the cinematic stages; `tile` matches the
 * square player tiles on the live board.
 */
export function OverflowMore({
  count,
  variant = "pill",
  className,
}: {
  count: number;
  variant?: OverflowVariant;
  className?: string;
}) {
  if (count <= 0) return null;
  if (variant === "tile") {
    return (
      <div
        className={cn(
          "flex aspect-square flex-col items-center justify-center border border-dashed border-nyx-line/70 bg-nyx/40 p-3 text-center",
          className,
        )}
        aria-label={`${count} more players`}
      >
        <span className="text-2xl font-extralight tabular-nums text-cloud">+{count}</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ash">more</span>
      </div>
    );
  }
  return (
    <span
      className={cn(
        "flex items-center border border-dashed border-nyx-line/60 bg-nyx-soft/40 px-3 py-1.5 text-xs text-ash",
        className,
      )}
    >
      +{count} more
    </span>
  );
}
