"use client";

import { ChevronLeft, ChevronRight, Clapperboard, Eye, EyeOff, Images } from "lucide-react";
import { useState } from "react";
import { authedFetch } from "@/app/operator/api";

const SCENES = ["arrival", "runway", "missions", "puzzle", "elimination", "finale"];

export function ProjectionControls({ token }: { token: string }) {
  const [scene, setScene] = useState<string | null>(null);
  const [gameId, setGameId] = useState("");
  const [note, setNote] = useState<string | null>(null);

  async function post(body: unknown, label: string) {
    const res = await authedFetch(token, "/api/operator/projection", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setNote(res.ok ? label : "command failed");
    setTimeout(() => setNote(null), 2500);
  }

  async function advancePuzzle(step: "next" | "prev") {
    const res = await authedFetch(token, "/api/operator/projection", {
      method: "POST",
      body: JSON.stringify({ action: "puzzle", step }),
    });
    if (!res.ok) {
      setNote("command failed");
      setTimeout(() => setNote(null), 2500);
      return;
    }
    const d = (await res.json()) as { label: string; index: number; total: number };
    setNote(`puzzle ${d.index}/${d.total} → ${d.label}`);
    setTimeout(() => setNote(null), 5000);
  }

  return (
    <section className="reticle border border-nyx-line bg-nyx-soft p-5">
      <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
        <Clapperboard className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        run of show
      </h2>

      <p className="mt-4 text-xs text-ash">scene: sets the mood label on the projection board</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SCENES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setScene(s);
              post({ action: "scene", scene: s }, `scene → ${s}`);
            }}
            className={`rounded-md border px-3 py-1 text-xs transition-colors ${
              scene === s ? "border-helio text-helio" : "border-nyx-line text-cloud hover:border-helio/50"
            }`}
          >
            {s}
          </button>
        ))}
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

      <p className="mt-5 flex items-center gap-2 text-xs leading-relaxed text-ash">
        <Images className="h-3.5 w-3.5 shrink-0 text-helio" strokeWidth={1.5} aria-hidden />
        Decode-the-labyrinth image on the board. Advance when the room cracks it.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => advancePuzzle("prev")}
          className="flex items-center gap-1.5 rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-helio/50"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          prev
        </button>
        <button
          type="button"
          onClick={() => advancePuzzle("next")}
          className="flex items-center gap-1.5 rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-helio/50"
        >
          next
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      {note ? <p className="mt-4 text-xs text-helio">{note}</p> : null}
    </section>
  );
}
