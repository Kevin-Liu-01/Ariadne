import { announcementCopy } from "@/constants/copy";
import type { Announcement } from "@/server/db/repositories/announcements";
import type { Repositories } from "@/server/db/repositories";

export interface BroadcastResult {
  recipients: number; // guests the announcement targeted
  delivered: number; // sends the gateway accepted
  skippedPaused: number; // checked-in guests who paused texts (left alone)
  announcement: Announcement;
}

type SendText = (phone: string, text: string) => Promise<boolean>;

/**
 * Operator-typed announcements to the whole room. Targets every checked-in guest
 * with a phone, except those who said "stop texting me" (we honor the pause). The
 * send is injected so the route can wire real outbound and tests can assert.
 */
export class AnnouncementService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
  ) {}

  async broadcast(rawBody: string, send: SendText): Promise<BroadcastResult> {
    const body = rawBody.trim();
    if (!body) throw new Error("announcement body is empty");

    const [participants, conversations] = await Promise.all([
      this.repos.participants.listByEvent(this.eventId),
      this.repos.conversations.listByEvent(this.eventId),
    ]);
    const pausedIds = new Set(
      conversations.filter((c) => c.textsPaused && c.participantId).map((c) => c.participantId),
    );

    const targets = participants.filter((p) => p.phone && !pausedIds.has(p.id));
    const skippedPaused = participants.filter((p) => p.phone && pausedIds.has(p.id)).length;

    const text = announcementCopy(body);
    const results = await Promise.all(targets.map((p) => send(p.phone as string, text)));
    const delivered = results.filter(Boolean).length;

    const announcement = await this.repos.announcements.insert(
      this.eventId,
      body,
      targets.length,
      delivered,
    );
    return { recipients: targets.length, delivered, skippedPaused, announcement };
  }

  async listRecent(limit = 20): Promise<Announcement[]> {
    return this.repos.announcements.listRecent(this.eventId, limit);
  }
}
