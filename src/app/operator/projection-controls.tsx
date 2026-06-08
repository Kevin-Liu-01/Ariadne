"use client";

import { Clapperboard, Eye, EyeOff, MessageSquare, MonitorPlay } from "lucide-react";
import { useEffect, useState } from "react";
import { type HomeMode } from "@/constants/event";
import { SCENES, nextScene } from "@/constants/scenes";
import { authedFetch } from "@/app/operator/api";
import { RecommendationStrip, type Suggestion } from "@/app/operator/recommendation-strip";
import { cn } from "@/lib/utils";

const HOME_MODE_OPTIONS: { mode: HomeMode; label: string; Icon: typeof MessageSquare }[] = [
  { mode: "imessage", label: "Text in (iMessage)", Icon: MessageSquare },
  { mode: "play", label: "Live Player screen", Icon: MonitorPlay },
];

export function ProjectionControls({ token }: { token: string }) {
  const [scene, setScene] = useState<string | null>(null);
  const [homeMode, setHomeMode] = useState<HomeMode | null>(null);
  const [gameId, setGameId] = useState("");
  const [note, setNote] = useState<string | null>(null);

  // Load the current scene + home mode so the controls reflect live state.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/projection/state")
      .then((res) => (res.ok ? res.json() : null))
      .then((snap: { scene?: string; homeMode?: HomeMode } | null) => {
        if (cancelled || !snap) return;
        if (snap.scene) setScene(snap.scene);
        if (snap.homeMode) setHomeMode(snap.homeMode);
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

  function pickHomeMode(mode: HomeMode) {
    setHomeMode(mode);
    void post({ action: "home_mode", mode }, mode === "play" ? "home -> Live Player" : "home -> iMessage");
  }

  return (
    <section className="border border-nyx-line bg-nyx-soft p-5">
      <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-helio">
        <Clapperboard className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        run of show
      </h2>

      <p className="mt-4 text-xs text-ash">
        scene: updates the projection board only (no automatic texts). Use announcements to text the
        room.
      </p>
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

      <p className="mt-5 text-xs text-ash">
        home screen: which check-in the landing page leads with for everyone
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {HOME_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            onClick={() => pickHomeMode(opt.mode)}
            aria-pressed={homeMode === opt.mode}
            className={cn(
              "flex items-center justify-center gap-2 border px-3 py-2 text-xs transition-colors",
              homeMode === opt.mode
                ? "border-helio/60 bg-helio/15 text-cloud"
                : "border-nyx-line text-ash hover:border-helio/40 hover:text-cloud",
            )}
          >
            <opt.Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {opt.label}
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

      {note ? <p className="mt-4 text-xs text-helio">{note}</p> : null}
    </section>
  );
}
