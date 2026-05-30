"use client";

import {
  ArrowRight,
  ChevronDown,
  Hash,
  KeyRound,
  MessageSquare,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
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
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-helio">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          {result.isNew ? "you're threaded in" : "already in"}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <GemDot hex={p.gemHex} size={22} label={p.gemLabel} />
          <div>
            <p className="text-lg text-cloud">{p.gemLabel}</p>
            <p className="text-xs text-ash">your gem — team up with other colors</p>
          </div>
          <div className="ml-auto text-right">
            <p className="flex items-center justify-end gap-1.5 text-lg tabular-nums tracking-[0.15em] text-helio">
              <Hash className="h-3.5 w-3.5 text-ash" strokeWidth={1.5} aria-hidden />
              {p.gameId}
            </p>
            <p className="text-xs text-ash">your game id — how others tag you</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 border border-nyx-line bg-nyx px-4 py-3">
          <KeyRound className="h-4 w-4 shrink-0 text-helio" strokeWidth={1.5} aria-hidden />
          <div>
            <p className="tracking-wide text-cloud">{p.secretWord}</p>
            <p className="text-xs text-ash">your secret word — pair it with someone to form a phrase</p>
          </div>
        </div>

        {result.firstMission ? (
          <div className="mt-4 border-l-2 border-helio/50 pl-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-helio">
              <Target className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              first mission · {result.firstMission.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-cloud">{result.firstMission.prompt}</p>
          </div>
        ) : null}

        {phoneNumber ? (
          <div className="mt-5 border border-helio/40 bg-helio/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-helio">next step</p>
            <p className="mt-1 text-sm leading-relaxed text-cloud">
              Text <span className="tabular-nums tracking-wide text-helio">{phoneNumber}</span> to
              play. Compare your <span className="text-helio">{p.gemLabel}</span> gem with others on
              the live board. Keep game id <span className="tabular-nums">{p.gameId}</span> and
              secret word handy — missions may ask for them.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex items-start gap-2 border-t border-nyx-line/60 pt-4 text-xs leading-relaxed text-ash">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ash" strokeWidth={1.5} aria-hidden />
          <p>
            Keep this thread going by text{phoneNumber ? <span className="text-cloud"> to {phoneNumber}</span> : null}:
            send a <span className="text-cloud">mission answer</span> to solve it, a{" "}
            <span className="text-cloud">drink</span> to order it, or{" "}
            <span className="text-cloud">HELP</span> anytime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <p className="mb-5 text-center text-sm leading-relaxed text-ash">
        Connect to your personal agent. You&apos;ll get a color gem, a secret word, and your first
        mission — then play all night by text.
      </p>

      {smsHref ? (
        <a
          href={smsHref}
          className="reticle reticle-strong block border border-helio/40 bg-helio/10 px-6 py-5 text-center transition-colors hover:bg-helio/15"
        >
          <span className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] text-helio">
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            text to check in
          </span>
          <span className="mt-1 block text-xl tabular-nums tracking-[0.1em] text-cloud">
            {phoneNumber}
          </span>
          <span className="mt-1 block text-[11px] text-ash">opens your messages — just hit send</span>
        </a>
      ) : (
        <div className="reticle border border-nyx-line bg-nyx-soft px-6 py-5 text-center text-sm text-ash">
          event number not provisioned yet — use web check-in below.
        </div>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === "web" ? "home" : "web")}
        className="mt-4 flex w-full items-center justify-center gap-1.5 text-center text-xs uppercase tracking-[0.2em] text-ash hover:text-cloud"
      >
        {mode === "web" ? "hide web check-in" : "no phone? check in here"}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", mode === "web" && "rotate-180")}
          strokeWidth={1.5}
          aria-hidden
        />
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
            placeholder="phone — links your texts to this check-in"
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
            {busy ? "threading…" : "check in"}
            {busy ? null : <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-red-400">
          <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
