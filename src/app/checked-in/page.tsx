"use client";

import { ShieldCheck } from "lucide-react";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { DoorBoard } from "@/app/checked-in/door-board";
import { useOperatorToken } from "@/app/operator/use-operator-token";

/**
 * Guard door screen. Match a guest at the door against the waitlist and see who
 * has already checked in. Password-gated with the operator token; staff open it
 * once with /checked-in?token=... (the token persists).
 */
export default function CheckedInPage() {
  const { token, input, setInput, unlock, lock } = useOperatorToken();

  if (token) return <DoorBoard token={token} onLock={lock} />;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-nyx px-6 scanlines">
      <div className="relative z-[2] w-full max-w-sm animate-rise border border-nyx-line bg-nyx-soft p-6 text-center">
        <div className="mb-4 flex justify-center">
          <LabyrinthThread size={48} />
        </div>
        <h1 className="flex items-center justify-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
          door check-in
        </h1>
        <p className="mt-2 text-sm text-ash">Guards: paste the staff token to match guests against the list.</p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && unlock()}
          type="password"
          placeholder="operator token"
          className="mt-4 w-full border border-nyx-line bg-nyx px-4 py-3 text-cloud outline-none focus:border-helio/50"
        />
        <button
          type="button"
          onClick={unlock}
          className="mt-3 w-full bg-helio px-4 py-3 font-medium uppercase tracking-wide text-nyx"
        >
          open
        </button>
      </div>
    </main>
  );
}
