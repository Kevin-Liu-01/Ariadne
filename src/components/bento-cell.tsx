import { cn } from "@/lib/utils";

type Tone = "deep" | "dark" | "veil" | "none";

/** Scrim strength per tone, idle + on hover. `deep` keeps a light asset reading as dark UI. */
const TONE_SCRIM: Record<Exclude<Tone, "none">, string> = {
  deep: "bg-nyx/75 group-hover:bg-nyx/55",
  dark: "bg-nyx/55 group-hover:bg-nyx/30",
  veil: "bg-nyx/25 group-hover:bg-nyx/10",
};

interface BentoCellProps {
  /** A `bgimg-*` brand background class from globals.css. */
  bg: string;
  /** How heavily to scrim the image so the wall reads as cohesive dark UI. */
  tone?: Tone;
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
        <div className={cn("absolute inset-0 transition-colors duration-500", TONE_SCRIM[tone])} />
      ) : null}
    </div>
  );
}
