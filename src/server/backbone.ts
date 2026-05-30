import { env } from "@/lib/env";
import { getDb } from "@/server/db/client";
import type { DB } from "@/server/db/connection";
import { Repositories } from "@/server/db/repositories";
import { AgentBrain } from "@/server/agent/brain";
import { AgentRunner } from "@/server/agent/runner";
import { ConversationService } from "@/server/services/conversations";
import { DrinkService } from "@/server/services/drinks";
import { EventBus, getEventBus } from "@/server/services/event-bus";
import { MissionService } from "@/server/services/missions";
import { ProjectionService } from "@/server/services/projection";
import { RegistrationService } from "@/server/services/registration";
import { getDedalusChat } from "@/server/partners/dedalus/client";
import type { ChatFn } from "@/server/partners/dedalus/types";

export interface BackboneOptions {
  eventId?: string;
  bus?: EventBus;
  /** Inject the model call (tests). Defaults to the Dedalus gateway, resolved lazily. */
  chat?: ChatFn;
  model?: string;
}

/** Wires the shared event backbone: repositories + services + the default brain. */
export class Backbone {
  readonly eventId: string;
  readonly repos: Repositories;
  readonly bus: EventBus;
  readonly conversations: ConversationService;
  readonly projection: ProjectionService;
  readonly registration: RegistrationService;
  readonly drinks: DrinkService;
  readonly missions: MissionService;
  readonly runner: AgentRunner;
  readonly brain: AgentBrain;

  constructor(db: DB, options: BackboneOptions = {}) {
    this.eventId = options.eventId ?? env.eventId;
    this.bus = options.bus ?? new EventBus();
    this.repos = new Repositories(db);
    this.projection = new ProjectionService(this.eventId, this.repos, this.bus);
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
      this.runner,
    );
  }
}

// Singleton bound to the on-disk DB + process bus, memoized across HMR.
const globalRef = globalThis as unknown as { __ariadneBackbone?: Backbone };

export function getBackbone(): Backbone {
  if (!globalRef.__ariadneBackbone) {
    globalRef.__ariadneBackbone = new Backbone(getDb(), { bus: getEventBus() });
  }
  return globalRef.__ariadneBackbone;
}
