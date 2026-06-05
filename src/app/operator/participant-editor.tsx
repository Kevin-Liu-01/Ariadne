"use client";

import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { GEMS, GEM_IDS, type GemId, leastUsedGem } from "@/constants/gems";
import { MISSIONS } from "@/constants/missions";
import { GemIcon } from "@/components/gem-icon";
import { authedFetch, type OperatorParticipant } from "@/app/operator/api";
import { OperatorEditModal } from "@/app/operator/edit-modal";
import { RecommendationStrip, type Suggestion } from "@/app/operator/recommendation-strip";
import { cn } from "@/lib/utils";

const SCORE_STEPS = [...new Set(MISSIONS.map((m) => m.points))].sort((a, b) => a - b);

/** Short tag for a guest's status on a game; the active highlight already marks "current". */
function stageNote(status: string): string | undefined {
  switch (status) {
    case "completed":
      return "cleared";
    case "skipped":
      return "bypassed";
    case "submitted":
      return "in progress";
    case "failed":
      return "missed";
    default:
      return undefined;
  }
}

/** Edit a guest's name, gem, score, and fade state, or delete them. Recommends a balanced gem. */
export function ParticipantEditor({
  token,
  participant,
  gemCounts,
  onClose,
  onChanged,
}: {
  token: string;
  participant: OperatorParticipant;
  gemCounts: Partial<Record<GemId, number>>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [displayName, setDisplayName] = useState(participant.displayName ?? "");
  const [phone, setPhone] = useState(participant.phone ?? "");
  const [email, setEmail] = useState(participant.email ?? "");
  const [secretWord, setSecretWord] = useState(participant.secretWord);
  const [gem, setGem] = useState<GemId>(participant.gem);
  const [score, setScore] = useState(participant.score);
  const [eliminated, setEliminated] = useState(participant.eliminated);
  const [stage, setStageLocal] = useState<string | null>(participant.stage);
  const [quests, setQuests] = useState(participant.quests);
  const [stageBusy, setStageBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recommend the emptiest gem, but exclude the guest's own current gem from the tally.
  const balanced = useMemo(() => {
    const counts = { ...gemCounts };
    counts[participant.gem] = Math.max(0, (counts[participant.gem] ?? 1) - 1);
    return leastUsedGem(counts);
  }, [gemCounts, participant.gem]);

  const gemItems: Suggestion[] = useMemo(
    () =>
      GEM_IDS.map((id) => ({
        id,
        label: GEMS[id].label,
        note: GEMS[id].rsvp,
        recommended: id === balanced,
        icon: <GemIcon gem={id} size={18} />,
      })),
    [balanced],
  );

  const stageItems: Suggestion[] = useMemo(
    () => quests.map((q) => ({ id: q.id, label: q.title, note: stageNote(q.status) })),
    [quests],
  );

  // Stage moves apply immediately (a guest can be mid-game), separate from the Save button.
  async function pickStage(missionId: string) {
    if (missionId === stage || stageBusy) return;
    setStageBusy(true);
    setError(null);
    const res = await authedFetch(token, `/api/operator/participants/${participant.id}/stage`, {
      method: "POST",
      body: JSON.stringify({ missionId }),
    });
    setStageBusy(false);
    if (!res.ok) {
      setError(res.status === 401 ? "token rejected, lock and re-enter" : "could not move stage, try again");
      return;
    }
    const updated = (await res.json()) as OperatorParticipant;
    setStageLocal(updated.stage);
    setQuests(updated.quests);
    onChanged();
  }

  async function send(method: "PATCH" | "DELETE") {
    setSaving(true);
    setError(null);
    const trimmed = displayName.trim();
    const init =
      method === "PATCH"
        ? {
            method,
            body: JSON.stringify({
              displayName: trimmed.length > 0 ? trimmed : null,
              phone: phone.trim() || null,
              email: email.trim() || null,
              gem,
              secretWord: secretWord.trim() || participant.secretWord,
              score,
              eliminated,
            }),
          }
        : { method };
    const res = await authedFetch(token, `/api/operator/participants/${participant.id}`, init);
    setSaving(false);
    if (!res.ok) {
      setError(res.status === 401 ? "token rejected, lock and re-enter" : "could not save, try again");
      return;
    }
    onChanged();
    onClose();
  }

  return (
    <OperatorEditModal
      title="Edit guest"
      subtitle={`${participant.gameId}${participant.displayName ? ` · ${participant.displayName}` : ""}`}
      onClose={onClose}
      onSave={() => void send("PATCH")}
      onDelete={() => void send("DELETE")}
      saving={saving}
      saveLabel="save guest"
      deleteLabel="delete guest"
    >
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.25em] text-helio">display name</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="no name set"
          className="mt-2 w-full border border-nyx-line bg-nyx px-3 py-2 text-sm text-cloud outline-none focus:border-helio/50"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.25em] text-helio">phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            inputMode="tel"
            className="mt-2 w-full border border-nyx-line bg-nyx px-3 py-2 text-sm tabular-nums text-cloud outline-none focus:border-helio/50"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.25em] text-helio">email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guest@email.com"
            inputMode="email"
            className="mt-2 w-full border border-nyx-line bg-nyx px-3 py-2 text-sm lowercase text-cloud outline-none focus:border-helio/50"
          />
        </label>
      </div>

      <RecommendationStrip
        label="game stage"
        hint={stageBusy ? "moving…" : "applies immediately"}
        items={stageItems}
        activeId={stage}
        onPick={(id) => void pickStage(id)}
        columns={3}
      />

      <RecommendationStrip
        label="gem"
        hint="balanced pick recommended"
        items={gemItems}
        activeId={gem}
        onPick={(id) => setGem(id as GemId)}
        columns={3}
      />

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.25em] text-helio">score</span>
          <span className="text-xs tabular-nums text-ash">{score} pts</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={score}
            onChange={(e) => setScore(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 border border-nyx-line bg-nyx px-3 py-2 text-sm tabular-nums text-cloud outline-none focus:border-helio/50"
          />
          <div className="flex flex-wrap gap-1.5">
            {SCORE_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setScore((s) => s + step)}
                className="border border-nyx-line px-2 py-1.5 text-xs tabular-nums text-ash transition-colors hover:border-helio/50 hover:text-cloud"
              >
                +{step}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setScore(0)}
              className="flex items-center gap-1 border border-nyx-line px-2 py-1.5 text-xs text-ash transition-colors hover:border-helio/50 hover:text-cloud"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} aria-hidden />
              reset
            </button>
          </div>
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.25em] text-helio">secret word</span>
        <input
          value={secretWord}
          onChange={(e) => setSecretWord(e.target.value)}
          className="mt-2 w-full border border-nyx-line bg-nyx px-3 py-2 text-sm lowercase tracking-wide text-cloud outline-none focus:border-helio/50"
        />
      </label>

      <div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-helio">board status</span>
        <button
          type="button"
          onClick={() => setEliminated((v) => !v)}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 border px-3 py-2 text-xs uppercase tracking-widest transition-colors",
            eliminated
              ? "border-gem-peridot/60 text-gem-peridot hover:bg-gem-peridot/10"
              : "border-gem-garnet/50 text-gem-garnet hover:bg-gem-garnet/10",
          )}
        >
          {eliminated ? (
            <>
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              restore to board
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              fade from board
            </>
          )}
        </button>
      </div>

      {error ? <p className="text-xs text-gem-garnet">{error}</p> : null}
    </OperatorEditModal>
  );
}
