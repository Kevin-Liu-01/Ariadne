"use client";

import { Wine } from "lucide-react";
import { OperatorGate } from "@/components/operator-gate";
import { BarBoard } from "@/app/bar/bar-board";
import { useOperatorToken } from "@/app/operator/use-operator-token";

/**
 * Bartender display, meant to live full-screen on an iPad. Shows only the live
 * drink queue with one tap per order. Staff bootstrap it once with /bar?token=...
 * (the token persists), so bartenders never type anything.
 */
export default function BarPage() {
  const { token, input, setInput, unlock, lock } = useOperatorToken();

  if (token) return <BarBoard token={token} onLock={lock} />;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-nyx px-6 py-8 scanlines">
      <OperatorGate
        title="Bar display"
        Icon={Wine}
        description="The live drink queue, one tap per order. Paste the operator token once to open the queue; it stays unlocked on this screen."
        value={input}
        onChange={setInput}
        onUnlock={unlock}
        action="open"
      />
    </main>
  );
}
