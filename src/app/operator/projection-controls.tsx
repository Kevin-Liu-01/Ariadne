"use client";

import { Clapperboard, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { SCENES, nextScene } from "@/constants/scenes";
import { authedFetch } from "@/app/operator/api";
import { RecommendationStrip, type Suggestion } from "@/app/operator/recommendation-strip";

export function ProjectionControls({ token }: { token: string }) {
  const [scene, setScene] = useState<string | null>(null);
  const [gameId, setGameId] = useState("");
  const [note, setNote] = useState<string | null>(null);

  // Load the current scene so we can recommend the next one in the run of show.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/projection/state")
      .then((res) => (res.ok ? res.json() : null))
      .then((snap: { scene?: string } | null) => {
        if (!cancelled && snap?.scene) setScene(snap.scene);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function post(body: unknown, label: string) {
    const res = await authedFetch(token, "/api/operator/projection", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setNote(res.ok ? label : "command failed");
    setTimeout(() => setNote(null), 2500);
  }

  const recommendedNext = nextScene(scene ?? "arrival");
  const sceneItems: Suggestion[] = SCENES.map((s) => ({
    id: s.id,
    label: s.id,
    note: s.note,
    recommended: s.id === recommendedNext,
  }));

  function pickScene(id: string) {
    setScene(id);
    void post({ action: "scene", scene: id }, `scene to ${id}`);
  }

  return (
    <section className="border border-nyx-line bg-nyx-soft p-5">
      <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
        <Clapperboard className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        run of show
      </h2>

      <p className="mt-4 text-xs text-ash">scene: sets the mood label on the projection board</p>
      <div className="mt-3">
        <RecommendationStrip
          label="scene"
          hint="next in the run of show recommended"
          items={sceneItems}
          activeId={scene}
          onPick={pickScene}
          columns={3}
        />
      </div>

      <p className="mt-5 text-xs leading-relaxed text-ash">
        Fade hides a guest&apos;s tile on the projection board (tech issue or left early). Restore
        brings it back. Enter their game id:
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={gameId}
          onChange={(e) => setGameId(e.target.value.toUpperCase())}
          placeholder="G7F3"
          className="w-28 border border-nyx-line bg-nyx px-3 py-1 text-sm uppercase tabular-nums tracking-[0.15em] text-cloud outline-none focus:border-helio/50"
        />
        <button
          type="button"
          onClick={() => post({ action: "eliminate", gameId }, `faded ${gameId}`)}
          className="flex items-center gap-1.5 rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-gem-garnet"
        >
          <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          fade
        </button>
        <button
          type="button"
          onClick={() => post({ action: "restore", gameId }, `restored ${gameId}`)}
          className="flex items-center gap-1.5 rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-gem-peridot"
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          restore
        </button>
      </div>

      {note ? <p className="mt-4 text-xs text-helio">{note}</p> : null}
    </section>
  );
}
