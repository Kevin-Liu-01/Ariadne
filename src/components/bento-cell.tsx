import { cn } from "@/lib/utils";

interface BentoCellProps {
  /** A `bgimg-*` brand background class from globals.css. */
  bg: string;
  /** How heavily to scrim the image so the wall reads as cohesive dark UI. */
  tone?: "dark" | "veil" | "none";
  /** `contain` shows the full asset (posters); default is cover crop. */
  fit?: "cover" | "contain";
  className?: string;
}

/** Bordered bento tile filled with a brand background. */
export function BentoCell({ bg, tone = "dark", fit = "cover", className }: BentoCellProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden border border-nyx-line/70 bg-nyx",
        bg,
        fit === "contain" && "bgimg-fit-contain",
        className,
      )}
    >
      {tone !== "none" ? (
        <div
          className={cn(
            "absolute inset-0 transition-colors duration-500",
            tone === "dark" ? "bg-nyx/55 group-hover:bg-nyx/30" : "bg-nyx/25 group-hover:bg-nyx/10",
          )}
        />
      ) : null}
    </div>
  );
}
