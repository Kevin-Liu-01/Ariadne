"use client";

import { useState } from "react";
import { GemDot } from "@/components/gem-dot";
import { cn } from "@/lib/utils";

interface RegisterResult {
  isNew: boolean;
  participant: {
    gameId: string;
    gemLabel: string;
    gemHex: string;
    secretWord: string;
    displayName: string | null;
  };
  firstMission: { title: string; prompt: string } | null;
}

interface Props {
  phoneNumber: string;
  stationId: string | null;
}

export function CheckInPanel({ phoneNumber, stationId }: Props) {
  const [mode, setMode] = useState<"home" | "web">("home");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const smsHref = phoneNumber ? `sms:${phoneNumber}?&body=JOIN` : null;

  async function submitWeb(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/participants/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          stationId: stationId ?? undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult((await res.json()) as RegisterResult);
    } catch {
      setError("check-in failed — try texting the number instead.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const p = result.participant;
    return (
      <div className="reticle mt-10 border border-nyx-line bg-nyx-soft p-6 animate-rise">
        <p className="text-xs uppercase tracking-[0.25em] text-ash">
          {result.isNew ? "you're threaded in" : "already in"}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <GemDot hex={p.gemHex} size={22} label={p.gemLabel} />
          <div>
            <p className="text-lg text-cloud">{p.gemLabel}</p>
            <p className="text-xs text-ash">your gem</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg tabular-nums tracking-[0.15em] text-helio">{p.gameId}</p>
            <p className="text-xs text-ash">game id</p>
          </div>
        </div>
        <div className="mt-4 border border-nyx-line bg-nyx px-4 py-3">
          <p className="text-xs text-ash">secret word</p>
          <p className="tracking-wide text-cloud">{p.secretWord}</p>
        </div>
        {result.firstMission ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.25em] text-helio">
              {result.firstMission.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-cloud">{result.firstMission.prompt}</p>
          </div>
        ) : null}
        <p className="mt-6 text-xs text-ash">
          Text the event number anytime to order a drink or answer a mission.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      {smsHref ? (
        <a
          href={smsHref}
          className="reticle reticle-strong block border border-helio/40 bg-helio/10 px-6 py-5 text-center transition-colors hover:bg-helio/15"
        >
          <span className="block text-xs uppercase tracking-[0.25em] text-helio">
            text to check in
          </span>
          <span className="mt-1 block text-xl tabular-nums tracking-[0.1em] text-cloud">
            {phoneNumber}
          </span>
        </a>
      ) : (
        <div className="reticle border border-nyx-line bg-nyx-soft px-6 py-5 text-center text-sm text-ash">
          event number not provisioned yet — use web check-in below.
        </div>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === "web" ? "home" : "web")}
        className="mt-4 w-full text-center text-xs uppercase tracking-[0.2em] text-ash hover:text-cloud"
      >
        {mode === "web" ? "hide web check-in" : "or check in here"}
      </button>

      {mode === "web" ? (
        <form onSubmit={submitWeb} className="mt-4 grid gap-3 animate-rise">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name (optional)"
            className="border border-nyx-line bg-nyx px-4 py-3 text-cloud outline-none placeholder:text-ash/60 focus:border-helio/50"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="phone (so your texts link up)"
            inputMode="tel"
            className="border border-nyx-line bg-nyx px-4 py-3 text-cloud outline-none placeholder:text-ash/60 focus:border-helio/50"
          />
          <button
            type="submit"
            disabled={busy}
            className={cn(
              "bg-helio px-4 py-3 font-medium tracking-wide text-nyx uppercase transition-opacity",
              busy && "opacity-60",
            )}
          >
            {busy ? "threading…" : "check in"}
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-3 text-center text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
