"use client";

import { Disc3 } from "lucide-react";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { DjBoard } from "@/app/dj/dj-board";
import { useOperatorToken } from "@/app/operator/use-operator-token";

/**
 * DJ display. Guests text song requests to Ariadne; they land here for the DJ to
 * accept or pass, and the guest is texted the verdict. Staff open it once with
 * /dj?token=... (the token persists).
 */
export default function DjPage() {
  const { token, input, setInput, unlock, lock } = useOperatorToken();

  if (token) return <DjBoard token={token} onLock={lock} />;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-nyx px-6 scanlines">
      <div className="relative z-[2] w-full max-w-sm animate-rise border border-nyx-line bg-nyx-soft p-6 text-center">
        <div className="mb-4 flex justify-center">
          <LabyrinthThread size={48} />
        </div>
        <h1 className="flex items-center justify-center gap-2 text-lg font-semibold">
          <Disc3 className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
          dj display
        </h1>
        <p className="mt-2 text-sm text-ash">Staff: paste the operator token to open the request feed.</p>
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
