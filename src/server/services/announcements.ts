import { announcementCopy, sceneBroadcastCopy } from "@/constants/copy";
import type { Announcement } from "@/server/db/repositories/announcements";
import type { Repositories } from "@/server/db/repositories";

export interface BroadcastResult {
  recipients: number; // guests the announcement targeted
  delivered: number; // sends the gateway accepted
  skippedPaused: number; // checked-in guests who paused texts (left alone)
  announcement: Announcement;
}

export interface SceneBroadcastResult {
  recipients: number;
  delivered: number;
  skippedPaused: number;
}

type SendText = (phone: string, text: string) => Promise<boolean>;

/**
 * Room-wide texts: operator-typed announcements and scene-change announcements.
 * Both target every checked-in guest with a phone, except those who said "stop
 * texting me" (we honor the pause). The send is injected so the route wires real
 * outbound and tests can assert. These fire on the triggering action, never on a
 * cron; the only cron-driven texts are reminders.
 */
export class AnnouncementService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
  ) {}

  /** Checked-in guests with a phone, split into who to text vs who paused. */
  private async targets(): Promise<{ to: { id: string; phone: string }[]; skippedPaused: number }> {
    const [participants, conversations] = await Promise.all([
      this.repos.participants.listByEvent(this.eventId),
      this.repos.conversations.listByEvent(this.eventId),
    ]);
    const pausedIds = new Set(
      conversations.filter((c) => c.textsPaused && c.participantId).map((c) => c.participantId),
    );
    const reachable = participants.filter((p) => p.phone);
    return {
      to: reachable.filter((p) => !pausedIds.has(p.id)).map((p) => ({ id: p.id, phone: p.phone as string })),
      skippedPaused: reachable.filter((p) => pausedIds.has(p.id)).length,
    };
  }

  async broadcast(rawBody: string, send: SendText): Promise<BroadcastResult> {
    const body = rawBody.trim();
    if (!body) throw new Error("announcement body is empty");

    const { to, skippedPaused } = await this.targets();
    const text = announcementCopy(body);
    const results = await Promise.all(to.map((p) => send(p.phone, text)));
    const delivered = results.filter(Boolean).length;

    const announcement = await this.repos.announcements.insert(this.eventId, body, to.length, delivered);
    return { recipients: to.length, delivered, skippedPaused, announcement };
  }

  /**
   * Announce a scene change to the room immediately (fired by the operator's scene
   * action, not the cron). Scenes with no guest-facing copy (e.g. arrival) send
   * nothing. Not recorded in the announcement history; the board already reflects it.
   */
  async broadcastScene(sceneId: string, send: SendText): Promise<SceneBroadcastResult> {
    const text = sceneBroadcastCopy(sceneId);
    if (!text) return { recipients: 0, delivered: 0, skippedPaused: 0 };
    const { to, skippedPaused } = await this.targets();
    const results = await Promise.all(to.map((p) => send(p.phone, text)));
    return { recipients: to.length, delivered: results.filter(Boolean).length, skippedPaused };
  }

  async listRecent(limit = 20): Promise<Announcement[]> {
    return this.repos.announcements.listRecent(this.eventId, limit);
  }
}
