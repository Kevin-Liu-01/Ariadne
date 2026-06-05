import { env } from "@/lib/env";
import { getDb } from "@/server/db/client";
import type { Db } from "@/server/db/connection";
import { Repositories } from "@/server/db/repositories";
import { AgentBrain } from "@/server/agent/brain";
import { AgentRunner } from "@/server/agent/runner";
import { AnnouncementService } from "@/server/services/announcements";
import { ConversationService } from "@/server/services/conversations";
import { DrinkService } from "@/server/services/drinks";
import { MissionService } from "@/server/services/missions";
import { ParticipantAdminService } from "@/server/services/participant-admin";
import { PlayerService } from "@/server/play/player-service";
import { ProjectionService } from "@/server/services/projection";
import { RegistrationService } from "@/server/services/registration";
import { ReminderService } from "@/server/services/reminders";
import { getDedalusChat } from "@/server/partners/dedalus/client";
import type { ChatFn } from "@/server/partners/dedalus/types";

export interface BackboneOptions {
  eventId?: string;
  /** Inject the model call (tests). Defaults to the Dedalus gateway, resolved lazily. */
  chat?: ChatFn;
  model?: string;
}

/** Wires the shared event backbone: repositories + services + the default brain. */
export class Backbone {
  readonly eventId: string;
  readonly repos: Repositories;
  readonly conversations: ConversationService;
  readonly projection: ProjectionService;
  readonly registration: RegistrationService;
  readonly drinks: DrinkService;
  readonly missions: MissionService;
  readonly participantAdmin: ParticipantAdminService;
  readonly reminders: ReminderService;
  readonly announcements: AnnouncementService;
  readonly player: PlayerService;
  readonly runner: AgentRunner;
  readonly brain: AgentBrain;

  constructor(db: Db, options: BackboneOptions = {}) {
    this.eventId = options.eventId ?? env.eventId;
    this.repos = new Repositories(db);
    this.projection = new ProjectionService(this.eventId, this.repos);
    this.conversations = new ConversationService(this.eventId, this.repos);
    this.registration = new RegistrationService(
      this.eventId,
      this.repos,
      this.conversations,
      this.projection,
    );
    this.drinks = new DrinkService(this.eventId, this.repos, this.projection);
    this.missions = new MissionService(
      this.eventId,
      this.repos,
      this.conversations,
      this.projection,
    );
    this.participantAdmin = new ParticipantAdminService(this.repos, this.projection);
    this.reminders = new ReminderService(this.eventId, this.repos, this.missions);
    this.announcements = new AnnouncementService(this.eventId, this.repos);
    this.player = new PlayerService(
      this.eventId,
      this.repos,
      this.drinks,
      this.missions,
      this.conversations,
      this.projection,
    );

    // Default model call hits the Dedalus gateway, resolved lazily so constructing
    // a Backbone never requires DEDALUS_API_KEY (tests inject their own `chat`).
    const chat: ChatFn = options.chat ?? ((req) => getDedalusChat()(req));
    this.runner = new AgentRunner(
      {
        eventId: this.eventId,
        repos: this.repos,
        registration: this.registration,
        drinks: this.drinks,
        missions: this.missions,
        conversations: this.conversations,
        projection: this.projection,
      },
      chat,
      options.model ?? env.model,
      env.agentMaxSteps,
    );
    this.brain = new AgentBrain(
      this.eventId,
      this.repos,
      this.conversations,
      this.missions,
      this.projection,
      this.runner,
      this.drinks,
    );
  }
}

// Singleton bound to the Postgres pool, memoized across HMR + warm invocations.
const globalRef = globalThis as unknown as { __ariadneBackbone?: Backbone };

export function getBackbone(): Backbone {
  if (!globalRef.__ariadneBackbone) {
    globalRef.__ariadneBackbone = new Backbone(getDb());
  }
  return globalRef.__ariadneBackbone;
}
