"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { CONTACT_NAME, EVENT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { RunwayWordmark } from "@/components/runway-wordmark";
import { cn } from "@/lib/utils";
import { setPlayerToken } from "./player-token";

interface RegisterResult {
  playerToken: string;
}

/** Inline web check-in for the Live Player: first name in, signed token stored, screen unlocks. */
export function CheckInCard({ onToken }: { onToken: (token: string) => void }) {
  const nameId = useId();
  const phoneId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/participants/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as RegisterResult;
      setPlayerToken(data.playerToken);
      onToken(data.playerToken);
    } catch {
      setError("Check-in failed. Try again, or text the event line.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-nyx px-6 py-8 scanlines">
      <div className="w-full max-w-md animate-rise overflow-hidden border border-nyx-line bg-nyx-soft/70">
        <header className="bgimg-nyx-waves relative border-b border-nyx-line px-6 pb-7 pt-9 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-nyx/70 via-nyx/40 to-nyx-soft/90" />
          <div className="relative z-[2] flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-helio/40 bg-nyx/70 backdrop-blur-sm">
              <LabyrinthThread size={52} animate />
            </div>
            <h1 className="mt-4 font-display text-3xl font-extralight tracking-tight text-cloud">
              Play on this screen
            </h1>
            <p className="mt-1 text-sm text-helio">{PRODUCT_TAGLINE}</p>
            <div className="mt-3 flex flex-col items-center gap-1">
              <RunwayWordmark size="sm" />
              <p className="text-[11px] uppercase tracking-[0.3em] text-ash">{VENUE}</p>
            </div>
          </div>
        </header>

        <form onSubmit={submit} className="grid gap-3 px-6 pb-8 pt-6">
          <p className="text-center text-sm leading-relaxed text-ash">
            Check in with your first name. You'll get your gem, secret word, and quests,
            then play the whole night right here, no texting needed.
          </p>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="your first name"
            className="border border-nyx-line bg-nyx px-4 py-3 text-cloud outline-none placeholder:text-ash/60 focus:border-helio/50"
          />
          <input
            id={phoneId}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="mobile number (optional, links your texts)"
            inputMode="tel"
            className="border border-nyx-line bg-nyx px-4 py-3 text-cloud outline-none placeholder:text-ash/60 focus:border-helio/50"
          />
          <button
            type="submit"
            disabled={busy}
            className={cn(
              "flex items-center justify-center gap-2 bg-helio px-4 py-3 font-medium uppercase tracking-wide text-nyx transition-opacity",
              busy && "opacity-60",
            )}
          >
            {busy ? "checking in..." : "enter the labyrinth"}
            {busy ? null : <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />}
          </button>
          {error ? (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gem-garnet">
              <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {error}
            </p>
          ) : (
            <p className="text-center text-[11px] leading-relaxed text-ash/80">
              By checking in you agree to receive event texts from {CONTACT_NAME} about {EVENT_NAME}.
              Reply STOP to opt out.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
