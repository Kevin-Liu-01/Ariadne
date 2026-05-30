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

  async createFromText(
    participant: Participant,
    conversationId: string | null,
    rawText: string,
  ): Promise<DrinkOutcome> {
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

    await this.repos.transaction(async (r) => {
      await r.drinkOrders.insert(order);
      await r.drinkOrderEvents.insert(order.id, "queued", null);
    });
    await this.projection.emit("drink_order.milestone", {
      status: "queued",
      gameId: participant.gameId,
      label: order.label,
    });
    return { kind: "queued", order };
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
