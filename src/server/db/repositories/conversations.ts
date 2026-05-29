import type { InboundChannel, Flow } from "@/constants/event";
import { now } from "@/lib/time";
import type { DB } from "@/server/db/connection";
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
  constructor(db: DB) {
    super(db, "conversations");
  }

  insert(c: Conversation): void {
    this.stmt(
      `INSERT INTO conversations
        (id, event_id, participant_id, external_id, phone, channel, current_flow, current_mission_id, created_at, updated_at)
       VALUES (@id, @event_id, @participant_id, @external_id, @phone, @channel, @current_flow, @current_mission_id, @created_at, @updated_at)`,
    ).run({
      id: c.id,
      event_id: c.eventId,
      participant_id: c.participantId,
      external_id: c.externalId,
      phone: c.phone,
      channel: c.channel,
      current_flow: c.currentFlow,
      current_mission_id: c.currentMissionId,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    });
  }

  findById(id: string): Conversation | null {
    const row = this.stmt(`SELECT * FROM conversations WHERE id = ?`).get(id) as
      | ConversationRow
      | undefined;
    return row ? toConversation(row) : null;
  }

  findByExternalId(externalId: string): Conversation | null {
    const row = this.stmt(`SELECT * FROM conversations WHERE external_id = ?`).get(externalId) as
      | ConversationRow
      | undefined;
    return row ? toConversation(row) : null;
  }

  findByPhone(eventId: string, phone: string): Conversation | null {
    const row = this.stmt(
      `SELECT * FROM conversations WHERE event_id = ? AND phone = ? ORDER BY updated_at DESC LIMIT 1`,
    ).get(eventId, phone) as ConversationRow | undefined;
    return row ? toConversation(row) : null;
  }

  setParticipant(id: string, participantId: string): void {
    this.stmt(`UPDATE conversations SET participant_id = ?, updated_at = ? WHERE id = ?`).run(
      participantId,
      now(),
      id,
    );
  }

  setFlow(id: string, flow: Flow, missionId: string | null): void {
    this.stmt(
      `UPDATE conversations SET current_flow = ?, current_mission_id = ?, updated_at = ? WHERE id = ?`,
    ).run(flow, missionId, now(), id);
  }

  setExternalId(id: string, externalId: string | null): void {
    this.stmt(`UPDATE conversations SET external_id = ?, updated_at = ? WHERE id = ?`).run(
      externalId,
      now(),
      id,
    );
  }
}
