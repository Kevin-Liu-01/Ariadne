import type { Db } from "@/server/db/connection";
import { AnnouncementsRepository } from "@/server/db/repositories/announcements";
import { ConversationsRepository } from "@/server/db/repositories/conversations";
import { CountersRepository } from "@/server/db/repositories/counters";
import { DrinkOrderEventsRepository, DrinkOrdersRepository } from "@/server/db/repositories/drinks";
import {
  MissionEventsRepository,
  ParticipantMissionsRepository,
} from "@/server/db/repositories/missions";
import { MessagesRepository } from "@/server/db/repositories/messages";
import { OperatorAlertsRepository } from "@/server/db/repositories/operator-alerts";
import { ParticipantsRepository } from "@/server/db/repositories/participants";
import { PartnerEventsRepository } from "@/server/db/repositories/partner-events";
import { ProjectionEventsRepository } from "@/server/db/repositories/projection";
import { RemindersRepository } from "@/server/db/repositories/reminders";
import { RiddleSolvesRepository } from "@/server/db/repositories/riddle-solves";
import { SongRequestsRepository } from "@/server/db/repositories/song-requests";

/** All repositories bound to one Db handle. Constructed once per backbone (and once per transaction). */
export class Repositories {
  readonly participants: ParticipantsRepository;
  readonly conversations: ConversationsRepository;
  readonly partnerEvents: PartnerEventsRepository;
  readonly participantMissions: ParticipantMissionsRepository;
  readonly missionEvents: MissionEventsRepository;
  readonly riddleSolves: RiddleSolvesRepository;
  readonly drinkOrders: DrinkOrdersRepository;
  readonly drinkOrderEvents: DrinkOrderEventsRepository;
  readonly projection: ProjectionEventsRepository;
  readonly messages: MessagesRepository;
  readonly operatorAlerts: OperatorAlertsRepository;
  readonly reminders: RemindersRepository;
  readonly songRequests: SongRequestsRepository;
  readonly announcements: AnnouncementsRepository;
  readonly counters: CountersRepository;

  constructor(private readonly db: Db) {
    this.participants = new ParticipantsRepository(db);
    this.conversations = new ConversationsRepository(db);
    this.partnerEvents = new PartnerEventsRepository(db);
    this.participantMissions = new ParticipantMissionsRepository(db);
    this.missionEvents = new MissionEventsRepository(db);
    this.riddleSolves = new RiddleSolvesRepository(db);
    this.drinkOrders = new DrinkOrdersRepository(db);
    this.drinkOrderEvents = new DrinkOrderEventsRepository(db);
    this.projection = new ProjectionEventsRepository(db);
    this.messages = new MessagesRepository(db);
    this.operatorAlerts = new OperatorAlertsRepository(db);
    this.reminders = new RemindersRepository(db);
    this.songRequests = new SongRequestsRepository(db);
    this.announcements = new AnnouncementsRepository(db);
    this.counters = new CountersRepository(db);
  }

  /**
   * Run a unit of work atomically. The callback receives a Repositories bound to
   * the transaction's connection, so every write inside commits or rolls back
   * together. Side effects (projection emits) belong after the call returns.
   */
  async transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(new Repositories(tx)));
  }
}
