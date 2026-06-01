import type { Participant } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { ParticipantEdit } from "@/server/db/repositories/participants";
import type { ProjectionService } from "@/server/services/projection";

/**
 * Operator-only edits and deletes of guests. The agent never calls this; it is the
 * staff console's path for fixing a name, recoloring a gem, correcting a score,
 * fading a guest, or removing one entirely. Changes the board renders live are
 * fanned out as projection events; the rest are picked up on the board's heal poll.
 */
export class ParticipantAdminService {
  constructor(
    private readonly repos: Repositories,
    private readonly projection: ProjectionService,
  ) {}

  async edit(id: string, edit: ParticipantEdit): Promise<Participant | null> {
    const before = await this.repos.participants.findById(id);
    if (!before) return null;

    const updated = await this.repos.participants.applyEdits(id, edit);
    if (!updated) return null;

    if (edit.score !== undefined && updated.score !== before.score) {
      await this.projection.emit("score.updated", { gameId: updated.gameId, score: updated.score });
    }
    if (edit.eliminated !== undefined && updated.eliminated !== before.eliminated) {
      await this.projection.emit(
        updated.eliminated ? "participant.eliminated" : "participant.restored",
        { gameId: updated.gameId },
      );
    }
    return updated;
  }

  /** Remove a guest and every row that hangs off them, then drop their tile from the board. */
  async remove(id: string): Promise<boolean> {
    const participant = await this.repos.participants.findById(id);
    if (!participant) return false;

    await this.repos.transaction(async (r) => {
      await r.drinkOrders.removeByParticipant(id);
      await r.participantMissions.removeByParticipant(id);
      await r.missionEvents.removeByParticipant(id);
      await r.conversations.unlinkParticipant(id);
      await r.participants.remove(id);
    });

    // Hide the tile immediately; the board's heal poll then rebuilds without the guest.
    await this.projection.emit("participant.eliminated", { gameId: participant.gameId });
    return true;
  }
}
