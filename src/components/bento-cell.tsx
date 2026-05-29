import { cn } from "@/lib/utils";

interface BentoCellProps {
  /** A `bgimg-*` brand background class from globals.css. */
  bg: string;
  label?: string;
  /** How heavily to scrim the image so the wall reads as cohesive dark UI. */
  tone?: "dark" | "veil";
  className?: string;
}

/** A reticle-framed bento tile filled with a brand background and a HUD label. */
export function BentoCell({ bg, label, tone = "dark", className }: BentoCellProps) {
  return (
    <div
      className={cn(
        "reticle group relative overflow-hidden border border-nyx-line/70",
        bg,
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 transition-colors duration-500",
          tone === "dark" ? "bg-nyx/55 group-hover:bg-nyx/30" : "bg-nyx/25 group-hover:bg-nyx/10",
        )}
      />
      {label ? (
        <span className="absolute bottom-2 left-2 z-[3] text-[10px] uppercase tracking-[0.25em] text-cloud/70">
          {label}
        </span>
      ) : null}
    </div>
  );
}
