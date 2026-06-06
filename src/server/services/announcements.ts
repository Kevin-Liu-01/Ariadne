import { announcementCopy, sceneBroadcastCopy } from "@/constants/copy";
import type { Announcement } from "@/server/db/repositories/announcements";
import type { Repositories } from "@/server/db/repositories";

export interface BroadcastResult {
  recipients: number; // phones the announcement targeted (deduped)
  delivered: number; // sends the gateway accepted
  skippedPaused: number; // phones that asked us to stop (left alone)
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
 * An operator announcement reaches everyone who has texted the line (checked in or
 * not, deduped by phone) so a name-only check-in nudge can win back people who
 * never finished. Scene-change texts stay scoped to checked-in players. Both honor
 * "stop texting me" (the pause). The send is injected so the route wires real
 * outbound and tests can assert. These fire on the triggering action, never on a
 * cron; the only cron-driven texts are reminders.
 */
export class AnnouncementService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
  ) {}

  /**
   * Reachable phones for a room text, deduped so one human gets one message. STOP/
   * paused phones are always excluded. `everyone` widens past checked-in guests to
   * anyone who has texted the line (operator announcements); scene texts pass false
   * to stay scoped to checked-in players.
   */
  private async targets(everyone: boolean): Promise<{ phones: string[]; skippedPaused: number }> {
    const [participants, conversations] = await Promise.all([
      this.repos.participants.listByEvent(this.eventId),
      this.repos.conversations.listAllByEvent(this.eventId),
    ]);

    // STOP is honored across the conversation's own phone and any participant it links.
    const participantPhoneById = new Map(participants.map((p) => [p.id, p.phone]));
    const pausedPhones = new Set<string>();
    for (const c of conversations) {
      if (!c.textsPaused) continue;
      if (c.phone) pausedPhones.add(c.phone);
      const linked = c.participantId ? participantPhoneById.get(c.participantId) : null;
      if (linked) pausedPhones.add(linked);
    }

    const candidates = new Set<string>();
    for (const p of participants) {
      if (p.phone) candidates.add(p.phone);
    }
    if (everyone) {
      for (const c of conversations) {
        if (c.phone) candidates.add(c.phone);
      }
    }

    const phones: string[] = [];
    let skippedPaused = 0;
    for (const phone of candidates) {
      if (pausedPhones.has(phone)) skippedPaused += 1;
      else phones.push(phone);
    }
    return { phones, skippedPaused };
  }

  async broadcast(rawBody: string, send: SendText): Promise<BroadcastResult> {
    const body = rawBody.trim();
    if (!body) throw new Error("announcement body is empty");

    const { phones, skippedPaused } = await this.targets(true);
    const text = announcementCopy(body);
    const results = await Promise.all(phones.map((phone) => send(phone, text)));
    const delivered = results.filter(Boolean).length;

    const announcement = await this.repos.announcements.insert(this.eventId, body, phones.length, delivered);
    return { recipients: phones.length, delivered, skippedPaused, announcement };
  }

  /**
   * Announce a scene change to the room immediately (fired by the operator's scene
   * action, not the cron). Scoped to checked-in players. Scenes with no guest-facing
   * copy (e.g. arrival) send nothing. Not recorded in the announcement history; the
   * board already reflects it.
   */
  async broadcastScene(sceneId: string, send: SendText): Promise<SceneBroadcastResult> {
    const text = sceneBroadcastCopy(sceneId);
    if (!text) return { recipients: 0, delivered: 0, skippedPaused: 0 };
    const { phones, skippedPaused } = await this.targets(false);
    const results = await Promise.all(phones.map((phone) => send(phone, text)));
    return { recipients: phones.length, delivered: results.filter(Boolean).length, skippedPaused };
  }

  async listRecent(limit = 20): Promise<Announcement[]> {
    return this.repos.announcements.listRecent(this.eventId, limit);
  }
}
