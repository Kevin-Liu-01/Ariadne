import { GEMS } from "@/constants/gems";
import type { Participant } from "@/domain/types";

/** The participant shape the operator console consumes (matches `OperatorParticipant`). */
export function participantView(p: Participant) {
  return {
    id: p.id,
    gameId: p.gameId,
    displayName: p.displayName,
    gem: p.gem,
    gemLabel: GEMS[p.gem].label,
    gemHex: GEMS[p.gem].hex,
    secretWord: p.secretWord,
    score: p.score,
    eliminated: p.eliminated,
    phone: p.phone,
    email: p.email,
  };
}
