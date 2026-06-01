"use client";

import { useMemo, useState } from "react";
import { DRINK_MENU, DRINK_MODIFIERS } from "@/constants/drinks";
import { authedFetch, type OperatorOrder } from "@/app/operator/api";
import { drinkCategoryIcon, sameCategoryDrinkIds } from "@/app/operator/drink-visuals";
import { OperatorEditModal } from "@/app/operator/edit-modal";
import { RecommendationStrip, type Suggestion } from "@/app/operator/recommendation-strip";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  cocktail: "cocktail",
  wine: "wine",
  beer: "beer",
  zero_proof: "zero-proof",
};

/** Change the drink and modifiers on an order, or delete it. Recommends same-category swaps. */
export function DrinkEditor({
  token,
  order,
  onClose,
  onChanged,
}: {
  token: string;
  order: OperatorOrder;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [menuItemId, setMenuItemId] = useState(order.menuItemId);
  const [modifiers, setModifiers] = useState<string[]>(order.modifiers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommended = useMemo(() => sameCategoryDrinkIds(order.menuItemId), [order.menuItemId]);

  const items: Suggestion[] = useMemo(
    () =>
      DRINK_MENU.filter((d) => d.available).map((d) => {
        const Icon = drinkCategoryIcon(d.category);
        return {
          id: d.id,
          label: d.label,
          note: CATEGORY_LABEL[d.category],
          recommended: recommended.has(d.id),
          icon: <Icon className="h-4 w-4 text-ash" strokeWidth={1.5} aria-hidden />,
        };
      }),
    [recommended],
  );

  function toggleModifier(mod: string) {
    setModifiers((prev) => (prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]));
  }

  async function send(method: "PATCH" | "DELETE") {
    setSaving(true);
    setError(null);
    const init =
      method === "PATCH"
        ? { method, body: JSON.stringify({ menuItemId, modifiers }) }
        : { method };
    const res = await authedFetch(token, `/api/operator/drink-orders/${order.id}`, init);
    setSaving(false);
    if (!res.ok) {
      setError(res.status === 401 ? "token rejected, lock and re-enter" : "could not save, try again");
      return;
    }
    onChanged();
    onClose();
  }

  return (
    <OperatorEditModal
      title="Edit order"
      subtitle={`${order.label}${order.guest?.gameId ? ` · ${order.guest.gameId}` : ""}`}
      onClose={onClose}
      onSave={() => void send("PATCH")}
      onDelete={() => void send("DELETE")}
      saving={saving}
      saveLabel="save order"
      deleteLabel="delete order"
    >
      <RecommendationStrip
        label="swap drink"
        hint="same category recommended"
        items={items}
        activeId={menuItemId}
        onPick={setMenuItemId}
      />

      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-helio">modifiers</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DRINK_MODIFIERS.map((mod) => {
            const on = modifiers.includes(mod);
            return (
              <button
                key={mod}
                type="button"
                onClick={() => toggleModifier(mod)}
                aria-pressed={on}
                className={cn(
                  "border px-3 py-1.5 text-xs transition-colors",
                  on
                    ? "border-helio bg-helio/10 text-cloud"
                    : "border-nyx-line text-ash hover:border-helio/50 hover:text-cloud",
                )}
              >
                {mod}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-xs text-gem-garnet">{error}</p> : null}
    </OperatorEditModal>
  );
}
