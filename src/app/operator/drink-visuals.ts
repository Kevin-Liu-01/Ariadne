import { Beer, Droplets, Martini, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DRINK_MENU, type MenuItem } from "@/constants/drinks";

export const DRINK_PIPELINE = ["queued", "in_progress", "ready", "picked_up"] as const;
export type DrinkPipelineStatus = (typeof DRINK_PIPELINE)[number];

const PIPELINE_LABELS: Record<DrinkPipelineStatus, string> = {
  queued: "queued",
  in_progress: "making",
  ready: "ready",
  picked_up: "done",
};

export function pipelineLabel(status: string): string {
  if (status in PIPELINE_LABELS) return PIPELINE_LABELS[status as DrinkPipelineStatus];
  return status.replace(/_/g, " ");
}

export function drinkCategoryForLabel(label: string): MenuItem["category"] {
  const item = DRINK_MENU.find((d) => d.label === label);
  return item?.category ?? "cocktail";
}

const CATEGORY_ICON: Record<MenuItem["category"], LucideIcon> = {
  cocktail: Martini,
  wine: Wine,
  beer: Beer,
  zero_proof: Droplets,
};

export function drinkCategoryIcon(category: MenuItem["category"]): LucideIcon {
  return CATEGORY_ICON[category];
}

export function pipelineIndex(status: string): number {
  const idx = (DRINK_PIPELINE as readonly string[]).indexOf(status);
  return idx >= 0 ? idx : 0;
}

/** Available items in the same category as the given drink, for "swap to" recommendations. */
export function sameCategoryDrinkIds(menuItemId: string): Set<string> {
  const item = DRINK_MENU.find((d) => d.id === menuItemId);
  if (!item) return new Set();
  return new Set(
    DRINK_MENU.filter((d) => d.category === item.category && d.id !== menuItemId && d.available).map(
      (d) => d.id,
    ),
  );
}
