import type { DB } from "@/server/db/connection";
import { ConversationsRepository } from "@/server/db/repositories/conversations";
import { DrinkOrderEventsRepository, DrinkOrdersRepository } from "@/server/db/repositories/drinks";
import {
  MissionEventsRepository,
  ParticipantMissionsRepository,
} from "@/server/db/repositories/missions";
import { OperatorAlertsRepository } from "@/server/db/repositories/operator-alerts";
import { ParticipantsRepository } from "@/server/db/repositories/participants";
import { PartnerEventsRepository } from "@/server/db/repositories/partner-events";
import { ProjectionEventsRepository } from "@/server/db/repositories/projection";

/** All repositories bound to one DB. Constructed once per backbone. */
export class Repositories {
  readonly participants: ParticipantsRepository;
  readonly conversations: ConversationsRepository;
  readonly partnerEvents: PartnerEventsRepository;
  readonly participantMissions: ParticipantMissionsRepository;
  readonly missionEvents: MissionEventsRepository;
  readonly drinkOrders: DrinkOrdersRepository;
  readonly drinkOrderEvents: DrinkOrderEventsRepository;
  readonly projection: ProjectionEventsRepository;
  readonly operatorAlerts: OperatorAlertsRepository;

  constructor(private readonly db: DB) {
    this.participants = new ParticipantsRepository(db);
    this.conversations = new ConversationsRepository(db);
    this.partnerEvents = new PartnerEventsRepository(db);
    this.participantMissions = new ParticipantMissionsRepository(db);
    this.missionEvents = new MissionEventsRepository(db);
    this.drinkOrders = new DrinkOrdersRepository(db);
    this.drinkOrderEvents = new DrinkOrderEventsRepository(db);
    this.projection = new ProjectionEventsRepository(db);
    this.operatorAlerts = new OperatorAlertsRepository(db);
  }

  /** Run a synchronous unit of work atomically. Side effects (bus emits) go after. */
  transaction<T>(work: () => T): T {
    return this.db.transaction(work)();
  }
}
