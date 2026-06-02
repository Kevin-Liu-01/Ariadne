import type { InboundChannel, Flow } from "@/constants/event";
import { now } from "@/lib/time";
import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { Conversation } from "@/domain/types";

interface ConversationRow {
  id: string;
  event_id: string;
  participant_id: string | null;
  external_id: string | null;
  phone: string | null;
  channel: string | null;
  current_flow: string;
  current_mission_id: string | null;
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
        (id, event_id, participant_id, external_id, phone, channel, current_flow, current_mission_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        c.id,
        c.eventId,
        c.participantId,
        c.externalId,
        c.phone,
        c.channel,
        c.currentFlow,
        c.currentMissionId,
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

  /** Every linked conversation for the event, newest first. The sweep maps these by participant. */
  async listByEvent(eventId: string): Promise<Conversation[]> {
    const rows = await this.db.query<ConversationRow>(
      `SELECT * FROM conversations WHERE event_id = $1 AND participant_id IS NOT NULL ORDER BY updated_at DESC`,
      [eventId],
    );
    return rows.map(toConversation);
  }

  /** Stamp activity so the reminder sweep can tell who is mid-conversation and leave them alone. */
  async touch(id: string): Promise<void> {
    await this.db.query(`UPDATE conversations SET updated_at = $1 WHERE id = $2`, [now(), id]);
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
