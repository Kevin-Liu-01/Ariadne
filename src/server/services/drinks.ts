import type { DrinkStatus } from "@/constants/drinks";
import { parseDrink } from "@/domain/drink-parse";
import { newId } from "@/domain/ids";
import { now } from "@/lib/time";
import type { DrinkOrder, Participant } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { ProjectionService } from "@/server/services/projection";

export type DrinkOutcome =
  | { kind: "queued"; order: DrinkOrder }
  | { kind: "clarify" }
  | { kind: "unavailable"; label: string };

/** Captures drink orders from free text and routes them to the bar queue. */
export class DrinkService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly projection: ProjectionService,
  ) {}

  createFromText(
    participant: Participant,
    conversationId: string | null,
    rawText: string,
  ): DrinkOutcome {
    const parsed = parseDrink(rawText);
    if (!parsed.item) return { kind: "clarify" };
    if (!parsed.item.available) return { kind: "unavailable", label: parsed.item.label };

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

    this.repos.transaction(() => {
      this.repos.drinkOrders.insert(order);
      this.repos.drinkOrderEvents.insert(order.id, "queued", null);
    });
    this.projection.emit("drink_order.milestone", {
      status: "queued",
      gameId: participant.gameId,
      label: order.label,
    });
    return { kind: "queued", order };
  }

  /** Operator transition. Returns the updated order (with the new milestone fanned out). */
  updateStatus(orderId: string, status: DrinkStatus, note: string | null): DrinkOrder | null {
    const updated = this.repos.transaction(() => {
      const u = this.repos.drinkOrders.setStatus(orderId, status, note);
      if (u) this.repos.drinkOrderEvents.insert(orderId, status, note);
      return u;
    });
    if (updated) {
      this.projection.emit("drink_order.milestone", {
        status,
        label: updated.label,
        orderId,
      });
    }
    return updated;
  }

  listActive(): DrinkOrder[] {
    return this.repos.drinkOrders.listActive(this.eventId);
  }

  listRecent(limit = 200): DrinkOrder[] {
    return this.repos.drinkOrders.listByEvent(this.eventId, limit);
  }

  get(orderId: string): DrinkOrder | null {
    return this.repos.drinkOrders.findById(orderId);
  }
}
