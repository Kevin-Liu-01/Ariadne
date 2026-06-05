"use client";

import { Disc3 } from "lucide-react";
import { OperatorGate } from "@/components/operator-gate";
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
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-nyx px-6 py-8 scanlines">
      <OperatorGate
        title="DJ display"
        Icon={Disc3}
        description="Song requests from the room land here to accept or pass, and the guest is texted the verdict. Paste the operator token once to open the feed."
        value={input}
        onChange={setInput}
        onUnlock={unlock}
        action="open"
      />
    </main>
  );
}
