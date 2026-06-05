import type { DrinkStatus } from "@/constants/drinks";
import {
  gameLockedCopy,
  hostRequestSubmittedCopy,
  pickupConfirmedCopy,
  songPromptCopy,
  songQueuedCopy,
} from "@/constants/copy";
import { GEMS, type GemId } from "@/constants/gems";
import { MISSIONS } from "@/constants/missions";
import { gameplayAllowed } from "@/constants/show-gate";
import { summarizeHostIssue } from "@/server/agent/host-issue";
import type { Repositories } from "@/server/db/repositories";
import type { SongStatus } from "@/server/db/repositories/song-requests";
import type { ConversationService } from "@/server/services/conversations";
import { drinkOutcomeSay, type DrinkService } from "@/server/services/drinks";
import { missionOutcomeSay, type MissionService } from "@/server/services/missions";
import type { ProjectionService } from "@/server/services/projection";

/** One of the three quests, with whether this guest has finished it (for the progress ticks). */
export interface PlayerQuest {
  id: string;
  title: string;
  done: boolean;
}

export interface PlayerMissions {
  questsDone: number;
  questsTotal: number;
  quests: PlayerQuest[];
  /** The quest to surface now; null when gameplay is locked or all three are done. */
  current: { id: string; title: string; prompt: string } | null;
}

export interface PlayerDrinkView {
  id: string;
  label: string;
  status: DrinkStatus;
}

export interface PlayerSongView {
  id: string;
  text: string;
  status: SongStatus;
}

/** The full live state the Live Player screen renders and polls. */
export interface PlayerView {
  participant: {
    gameId: string;
    displayName: string | null;
    gem: GemId;
    gemLabel: string;
    gemHex: string;
    secretWord: string;
    score: number;
    eliminated: boolean;
  };
  scene: string;
  gameplayOpen: boolean;
  rank: number | null;
  totalPlayers: number;
  missions: PlayerMissions;
  drink: PlayerDrinkView | null;
  song: PlayerSongView | null;
}

export interface PlayerActionResult {
  status: string;
  say: string;
}

export interface PlayerMissionResult {
  result: string;
  say: string;
}

export interface PlayerPickupResult {
  pickedUp: boolean;
  say: string;
  label: string | null;
}

export interface PlayerFlagResult {
  flagged: boolean;
  say: string;
}

/**
 * The web Live Player backend: assembles the read-model and routes tap actions to
 * the same deterministic services the text thread uses. State (score, quests,
 * drinks, songs) is participant-scoped, so this is purely an alternate front door,
 * never a second source of truth. Gameplay actions honor the run-of-show gate, so
 * the screen can only do what the room currently allows.
 */
export class PlayerService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly drinks: DrinkService,
    private readonly missions: MissionService,
    private readonly conversations: ConversationService,
    private readonly projection: ProjectionService,
  ) {}

  async me(participantId: string): Promise<PlayerView | null> {
    const [participant, finishedIds, scene, drink, song, roster] = await Promise.all([
      this.repos.participants.findById(participantId),
      this.repos.participantMissions.finishedMissionIds(participantId),
      this.projection.scene(),
      this.repos.drinkOrders.findLatestActiveByParticipant(participantId),
      this.repos.songRequests.findLatestByParticipant(participantId),
      this.repos.participants.listByEvent(this.eventId),
    ]);
    if (!participant) return null;

    const finished = new Set(finishedIds);
    const open = gameplayAllowed(scene);
    const quests: PlayerQuest[] = MISSIONS.map((m) => ({
      id: m.id,
      title: m.title,
      done: finished.has(m.id),
    }));
    // The next quest is read-only here (no assignment): the truth is the finished set.
    const currentTemplate = open ? (MISSIONS.find((m) => !finished.has(m.id)) ?? null) : null;
    const rankIndex = roster.findIndex((p) => p.id === participant.id);

    return {
      participant: {
        gameId: participant.gameId,
        displayName: participant.displayName,
        gem: participant.gem,
        gemLabel: GEMS[participant.gem].label,
        gemHex: GEMS[participant.gem].hex,
        secretWord: participant.secretWord,
        score: participant.score,
        eliminated: participant.eliminated,
      },
      scene,
      gameplayOpen: open,
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      totalPlayers: roster.length,
      missions: {
        questsDone: quests.filter((q) => q.done).length,
        questsTotal: quests.length,
        quests,
        current: currentTemplate
          ? {
              id: currentTemplate.id,
              title: currentTemplate.title,
              prompt: this.missions.renderPrompt(currentTemplate, participant),
            }
          : null,
      },
      drink: drink ? { id: drink.id, label: drink.label, status: drink.status } : null,
      song: song ? { id: song.id, text: song.rawText, status: song.status } : null,
    };
  }

  async orderDrink(participantId: string, text: string): Promise<PlayerActionResult | null> {
    const [participant, scene] = await Promise.all([
      this.repos.participants.findById(participantId),
      this.projection.scene(),
    ]);
    if (!participant) return null;
    if (!gameplayAllowed(scene)) return { status: "locked", say: gameLockedCopy() };
    const outcome = await this.drinks.createFromText(participant, null, text);
    return { status: outcome.kind, say: drinkOutcomeSay(outcome) };
  }

  async requestSong(participantId: string, text: string): Promise<PlayerActionResult | null> {
    const [participant, scene] = await Promise.all([
      this.repos.participants.findById(participantId),
      this.projection.scene(),
    ]);
    if (!participant) return null;
    if (!gameplayAllowed(scene)) return { status: "locked", say: gameLockedCopy() };
    const song = text.trim().replace(/^song[:\s]+/i, "").trim();
    if (!song) return { status: "clarify", say: songPromptCopy() };
    await this.repos.songRequests.create(this.eventId, participant.id, song);
    return { status: "queued", say: songQueuedCopy(song) };
  }

  async submitMission(participantId: string, text: string): Promise<PlayerMissionResult | null> {
    const [participant, scene] = await Promise.all([
      this.repos.participants.findById(participantId),
      this.projection.scene(),
    ]);
    if (!participant) return null;
    if (!gameplayAllowed(scene)) return { result: "locked", say: gameLockedCopy() };
    const conversation = await this.conversations.resolveForParticipant(participant.id);
    const outcome = await this.missions.submit(participant, conversation, text);
    return { result: outcome.kind, say: missionOutcomeSay(outcome) };
  }

  async confirmPickup(participantId: string): Promise<PlayerPickupResult | null> {
    const participant = await this.repos.participants.findById(participantId);
    if (!participant) return null;
    const order = await this.repos.drinkOrders.findReadyByParticipant(participant.id);
    if (!order) return { pickedUp: false, say: "You don't have a drink waiting right now.", label: null };
    await this.drinks.updateStatus(order.id, "picked_up", null);
    return { pickedUp: true, say: pickupConfirmedCopy(order.label), label: order.label };
  }

  async flag(participantId: string, reason: string): Promise<PlayerFlagResult | null> {
    const participant = await this.repos.participants.findById(participantId);
    if (!participant) return null;
    await this.repos.operatorAlerts.create(
      this.eventId,
      participant.id,
      participant.gameId,
      summarizeHostIssue(reason),
    );
    return { flagged: true, say: hostRequestSubmittedCopy() };
  }
}
