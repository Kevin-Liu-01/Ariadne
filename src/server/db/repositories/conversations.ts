import type { InboundChannel, Flow } from "@/constants/event";
import { now } from "@/lib/time";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { Conversation, HostRequestState, PendingIntent } from "@/domain/types";

interface ConversationRow {
  id: string;
  event_id: string;
  participant_id: string | null;
  external_id: string | null;
  phone: string | null;
  channel: string | null;
  current_flow: string;
  current_mission_id: string | null;
  contact_card_sent: boolean;
  welcome_image_sent: boolean;
  texts_paused: boolean;
  host_request_state: string | null;
  pending_intent: string | null;
  created_at: string;
  updated_at: string;
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    externalId: row.external_id,
    phone: row.phone,
    channel: row.channel as InboundChannel | null,
    currentFlow: row.current_flow as Flow,
    currentMissionId: row.current_mission_id,
    contactCardSent: row.contact_card_sent,
    welcomeImageSent: row.welcome_image_sent,
    textsPaused: row.texts_paused,
    hostRequestState: row.host_request_state as HostRequestState | null,
    pendingIntent: row.pending_intent ? (JSON.parse(row.pending_intent) as PendingIntent) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ConversationsRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "conversations");
  }

  async insert(c: Conversation): Promise<void> {
    await this.db.query(
      `INSERT INTO conversations
        (id, event_id, participant_id, external_id, phone, channel, current_flow, current_mission_id,
         contact_card_sent, welcome_image_sent, texts_paused, host_request_state, pending_intent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        c.id,
        c.eventId,
        c.participantId,
        c.externalId,
        c.phone,
        c.channel,
        c.currentFlow,
        c.currentMissionId,
        c.contactCardSent,
        c.welcomeImageSent,
        c.textsPaused,
        c.hostRequestState,
        c.pendingIntent ? JSON.stringify(c.pendingIntent) : null,
        c.createdAt,
        c.updatedAt,
      ],
    );
  }

  async findById(id: string): Promise<Conversation | null> {
    const rows = await this.db.query<ConversationRow>(`SELECT * FROM conversations WHERE id = $1`, [id]);
    return rows[0] ? toConversation(rows[0]) : null;
  }

  async findByExternalId(externalId: string): Promise<Conversation | null> {
    const rows = await this.db.query<ConversationRow>(
      `SELECT * FROM conversations WHERE external_id = $1`,
      [externalId],
    );
    return rows[0] ? toConversation(rows[0]) : null;
  }

  async findByPhone(eventId: string, phone: string): Promise<Conversation | null> {
    const rows = await this.db.query<ConversationRow>(
      `SELECT * FROM conversations WHERE event_id = $1 AND phone = $2 ORDER BY updated_at DESC LIMIT 1`,
      [eventId, phone],
    );
    return rows[0] ? toConversation(rows[0]) : null;
  }

  /** The guest's most recent linked thread, so the web player reuses it instead of forking a new one. */
  async findLatestByParticipant(participantId: string): Promise<Conversation | null> {
    const rows = await this.db.query<ConversationRow>(
      `SELECT * FROM conversations WHERE participant_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [participantId],
    );
    return rows[0] ? toConversation(rows[0]) : null;
  }

  /** Every linked conversation for the event, newest first. The sweep maps these by participant. */
  async listByEvent(eventId: string): Promise<Conversation[]> {
    const rows = await this.db.query<ConversationRow>(
      `SELECT * FROM conversations WHERE event_id = $1 AND participant_id IS NOT NULL ORDER BY updated_at DESC`,
      [eventId],
    );
    return rows.map(toConversation);
  }

  /**
   * Every conversation this event, including phone threads that texted in but never
   * checked in. Used by room-wide announcements that reach the whole texting
   * audience (listByEvent stays scoped to checked-in threads).
   */
  async listAllByEvent(eventId: string): Promise<Conversation[]> {
    const rows = await this.db.query<ConversationRow>(
      `SELECT * FROM conversations WHERE event_id = $1 ORDER BY updated_at DESC`,
      [eventId],
    );
    return rows.map(toConversation);
  }

  /** Stamp activity so the reminder sweep can tell who is mid-conversation and leave them alone. */
  async touch(id: string): Promise<void> {
    await this.db.query(`UPDATE conversations SET updated_at = $1 WHERE id = $2`, [now(), id]);
  }

  /**
   * Atomically claim the one-time contact-card send. The `AND contact_card_sent = FALSE`
   * guard + RETURNING means exactly one caller wins even if several inbound messages race,
   * so the card + intro is never sent twice. Returns true only for the winner.
   */
  async claimContactCardSend(id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE conversations SET contact_card_sent = TRUE, updated_at = $1
       WHERE id = $2 AND contact_card_sent = FALSE RETURNING id`,
      [now(), id],
    );
    return rows.length > 0;
  }

  /** Release a contact-card claim so a later message retries (used only when the send failed). */
  async releaseContactCardSend(id: string): Promise<void> {
    await this.db.query(
      `UPDATE conversations SET contact_card_sent = FALSE, updated_at = $1 WHERE id = $2`,
      [now(), id],
    );
  }

  /** Atomically claim the one-time welcome-image send (see {@link claimContactCardSend}). */
  async claimWelcomeImageSend(id: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE conversations SET welcome_image_sent = TRUE, updated_at = $1
       WHERE id = $2 AND welcome_image_sent = FALSE RETURNING id`,
      [now(), id],
    );
    return rows.length > 0;
  }

  /** Release a welcome-image claim so a later message retries (used only when the send failed). */
  async releaseWelcomeImageSend(id: string): Promise<void> {
    await this.db.query(
      `UPDATE conversations SET welcome_image_sent = FALSE, updated_at = $1 WHERE id = $2`,
      [now(), id],
    );
  }

  async setTextsPaused(id: string, paused: boolean): Promise<void> {
    await this.db.query(
      `UPDATE conversations SET texts_paused = $1, updated_at = $2 WHERE id = $3`,
      [paused, now(), id],
    );
  }

  async setHostRequestState(id: string, state: HostRequestState | null): Promise<void> {
    await this.db.query(
      `UPDATE conversations SET host_request_state = $1, updated_at = $2 WHERE id = $3`,
      [state, now(), id],
    );
  }

  /** Set or clear the one pending pre-eligibility request (deferred drink/song). */
  async setPendingIntent(id: string, intent: PendingIntent | null): Promise<void> {
    await this.db.query(
      `UPDATE conversations SET pending_intent = $1, updated_at = $2 WHERE id = $3`,
      [intent ? JSON.stringify(intent) : null, now(), id],
    );
  }

  async setParticipant(id: string, participantId: string): Promise<void> {
    await this.db.query(`UPDATE conversations SET participant_id = $1, updated_at = $2 WHERE id = $3`, [
      participantId,
      now(),
      id,
    ]);
  }

  async setFlow(id: string, flow: Flow, missionId: string | null): Promise<void> {
    await this.db.query(
      `UPDATE conversations SET current_flow = $1, current_mission_id = $2, updated_at = $3 WHERE id = $4`,
      [flow, missionId, now(), id],
    );
  }

  async setExternalId(id: string, externalId: string | null): Promise<void> {
    await this.db.query(`UPDATE conversations SET external_id = $1, updated_at = $2 WHERE id = $3`, [
      externalId,
      now(),
      id,
    ]);
  }

  /** Detach any conversations from a guest the operator is deleting, back to an idle thread. */
  async unlinkParticipant(participantId: string): Promise<void> {
    await this.db.query(
      `UPDATE conversations SET participant_id = NULL, current_flow = 'idle', current_mission_id = NULL, updated_at = $1 WHERE participant_id = $2`,
      [now(), participantId],
    );
  }
}
