"use client";

import { useState } from "react";
import { authedFetch } from "@/app/operator/api";

const SCENES = ["arrival", "runway", "missions", "elimination", "finale"];

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

  return (
    <section className="reticle border border-nyx-line bg-nyx-soft p-5">
      <h2 className="text-sm uppercase tracking-[0.25em] text-helio">run of show</h2>

      <p className="mt-4 text-xs text-ash">scene</p>
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

      <p className="mt-5 text-xs text-ash">fade / restore a guest (game id)</p>
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
          className="rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-gem-garnet"
        >
          fade
        </button>
        <button
          type="button"
          onClick={() => post({ action: "restore", gameId }, `restored ${gameId}`)}
          className="rounded-md border border-nyx-line px-3 py-1 text-xs text-cloud hover:border-gem-peridot"
        >
          restore
        </button>
      </div>

      {note ? <p className="mt-4 text-xs text-helio">{note}</p> : null}
    </section>
  );
}
