import type { Db } from "@/server/db/connection";
import { BaseRepository } from "@/server/db/repositories/base";
import type { Message, MessageDirection } from "@/domain/types";

/** A turn shaped for the model: who said it and what they said. */
export interface HistoryTurn {
  content: string;
  direction: MessageDirection;
}

/** Durable per-conversation transcript: our own source of truth for agent memory. */
export class MessagesRepository extends BaseRepository {
  constructor(db: Db) {
    super(db, "messages");
  }

  async insert(m: Message): Promise<void> {
    await this.db.query(
      `INSERT INTO messages
        (id, event_id, conversation_id, participant_id, direction, channel, body, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [m.id, m.eventId, m.conversationId, m.participantId, m.direction, m.channel, m.body, m.createdAt],
    );
  }

  /** The last `limit` turns for a conversation, oldest first (ready to feed the model). */
  async recentByConversation(conversationId: string, limit: number): Promise<HistoryTurn[]> {
    const rows = await this.db.query<{ body: string; direction: string }>(
      `SELECT body, direction FROM messages
       WHERE conversation_id = $1 ORDER BY seq DESC LIMIT $2`,
      [conversationId, limit],
    );
    return rows
      .reverse()
      .map((r) => ({ content: r.body, direction: r.direction as MessageDirection }));
  }
}
