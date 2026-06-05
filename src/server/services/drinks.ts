import {
  COCKTAIL_MENU_IDS,
  COCKTAIL_STOCK_PER_ITEM,
  COCKTAIL_VOUCHER_PER_GUEST,
  DRINK_DEDUP_WINDOW_MS,
  DRINK_MENU,
  type DrinkStatus,
} from "@/constants/drinks";
import {
  cocktailOutOfStockCopy,
  drinkAlreadyQueuedCopy,
  drinkClarifyCopy,
  drinkInvalidQuantityCopy,
  drinkQueuedCopy,
  drinkUnavailableCopy,
  drinkVoucherUsedCopy,
} from "@/constants/copy";
import { isMultiDrinkOrder, parseDrink } from "@/domain/drink-parse";
import { newId } from "@/domain/ids";
import { assertNever } from "@/lib/assert";
import { now } from "@/lib/time";
import type { DrinkOrder, Participant } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { ProjectionService } from "@/server/services/projection";

export type DrinkOutcome =
  | { kind: "queued"; order: DrinkOrder }
  | { kind: "already_queued"; order: DrinkOrder }
  | { kind: "clarify" }
  | { kind: "unavailable"; label: string }
  | { kind: "voucher_used" }
  | { kind: "out_of_stock"; label: string }
  | { kind: "invalid_quantity" };

/** The single guest-facing line for a drink outcome, shared by the tool and the brain. */
export function drinkOutcomeSay(outcome: DrinkOutcome): string {
  switch (outcome.kind) {
    case "queued":
      return drinkQueuedCopy(outcome.order.label);
    case "already_queued":
      return drinkAlreadyQueuedCopy(outcome.order.label);
    case "unavailable":
      return drinkUnavailableCopy(outcome.label);
    case "voucher_used":
      return drinkVoucherUsedCopy();
    case "out_of_stock":
      return cocktailOutOfStockCopy(outcome.label);
    case "invalid_quantity":
      return drinkInvalidQuantityCopy();
    case "clarify":
      return drinkClarifyCopy();
    default:
      return assertNever(outcome);
  }
}

/** Captures drink orders from free text and routes them to the bar queue. */
export class DrinkService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly projection: ProjectionService,
  ) {}

  async createFromText(
    participant: Participant,
    conversationId: string | null,
    rawText: string,
  ): Promise<DrinkOutcome> {
    if (isMultiDrinkOrder(rawText)) return { kind: "invalid_quantity" };
    const parsed = parseDrink(rawText);
    if (!parsed.item) return { kind: "clarify" };
    if (!parsed.item.available) return { kind: "unavailable", label: parsed.item.label };

    // Collapse an accidental repeat (model retry, double-tap, deferred-intent replay)
    // into the existing open order instead of queueing the same drink twice.
    const sinceIso = new Date(Date.now() - DRINK_DEDUP_WINDOW_MS).toISOString();
    const duplicate = await this.repos.drinkOrders.findRecentActiveByItem(
      participant.id,
      parsed.item.id,
      sinceIso,
    );
    if (duplicate) return { kind: "already_queued", order: duplicate };

    // Cocktails are gated; beer, wine, and zero-proof pour without limit. The voucher
    // is about this guest (have they already had a cocktail?), so it answers first: a
    // guest who is out of vouchers cannot have a cocktail regardless of what is in stock.
    // Only then do we check whether this specific cocktail has sold out, so a guest with
    // a voucher left learns the named cocktail is gone and can pick another.
    if (parsed.item.category === "cocktail") {
      const used = await this.repos.drinkOrders.countCocktailsByParticipant(
        participant.id,
        COCKTAIL_MENU_IDS,
      );
      if (used >= COCKTAIL_VOUCHER_PER_GUEST) return { kind: "voucher_used" };
      const poured = await this.repos.drinkOrders.countByMenuItemForEvent(this.eventId, parsed.item.id);
      if (poured >= COCKTAIL_STOCK_PER_ITEM) return { kind: "out_of_stock", label: parsed.item.label };
    }

    const order: DrinkOrder = {
      id: newId("drk"),
      eventId: this.eventId,
      participantId: participant.id,
      conversationId,
      rawText,
      menuItemId: parsed.item.id,
      label: parsed.item.label,
      modifiers: parsed.modifiers,
      status: "queued",
      operatorNotes: null,
      createdAt: now(),
      readyAt: null,
      pickedUpAt: null,
    };

    await this.repos.transaction(async (r) => {
      await r.drinkOrders.insert(order);
      await r.drinkOrderEvents.insert(order.id, "queued", null);
    });
    await this.projection.emit("drink_order.milestone", {
      status: "queued",
      gameId: participant.gameId,
      label: order.label,
    });

    // If this pour took the cocktail to its cap, alert the operator once. The pre-insert
    // guard above keeps the count from overshooting, so this trips a single time per
    // cocktail (on its 50th pour), naming the one that just sold out.
    if (parsed.item.category === "cocktail") {
      const pouredNow = await this.repos.drinkOrders.countByMenuItemForEvent(this.eventId, parsed.item.id);
      if (pouredNow >= COCKTAIL_STOCK_PER_ITEM) {
        await this.repos.operatorAlerts.create(
          this.eventId,
          null,
          null,
          `${order.label} sold out (${COCKTAIL_STOCK_PER_ITEM} poured). Other cocktails and unlimited drinks still on.`,
        );
        await this.projection.emit("drink_order.milestone", {
          status: "out_of_stock",
          label: order.label,
        });
      }
    }
    return { kind: "queued", order };
  }

  /** Expire a ready order the guest never picked up (distinct from an operator cancel). */
  async expire(orderId: string): Promise<DrinkOrder | null> {
    return this.updateStatus(orderId, "expired", "expired: not picked up");
  }

  /** Operator transition. Returns the updated order (with the new milestone fanned out). */
  async updateStatus(
    orderId: string,
    status: DrinkStatus,
    note: string | null,
  ): Promise<DrinkOrder | null> {
    const updated = await this.repos.transaction(async (r) => {
      const u = await r.drinkOrders.setStatus(orderId, status, note);
      if (u) await r.drinkOrderEvents.insert(orderId, status, note);
      return u;
    });
    if (updated) {
      await this.projection.emit("drink_order.milestone", {
        status,
        label: updated.label,
        orderId,
      });
    }
    return updated;
  }

  /** Operator edit: swap the ordered item / modifiers. Returns null if the item id is unknown. */
  async editItem(
    orderId: string,
    menuItemId: string,
    modifiers: string[],
  ): Promise<DrinkOrder | null> {
    const item = DRINK_MENU.find((d) => d.id === menuItemId);
    if (!item) return null;
    return this.repos.transaction(async (r) => {
      const updated = await r.drinkOrders.updateItem(orderId, item.id, item.label, modifiers);
      if (updated) await r.drinkOrderEvents.insert(orderId, updated.status, `edited to ${item.label}`);
      return updated;
    });
  }

  /** Operator delete: drop an order and its history entirely. */
  async remove(orderId: string): Promise<boolean> {
    return this.repos.transaction(async (r) => {
      await r.drinkOrderEvents.deleteByOrder(orderId);
      return r.drinkOrders.remove(orderId);
    });
  }

  async listActive(): Promise<DrinkOrder[]> {
    return this.repos.drinkOrders.listActive(this.eventId);
  }

  async listRecent(limit = 200): Promise<DrinkOrder[]> {
    return this.repos.drinkOrders.listByEvent(this.eventId, limit);
  }

  async get(orderId: string): Promise<DrinkOrder | null> {
    return this.repos.drinkOrders.findById(orderId);
  }
}
