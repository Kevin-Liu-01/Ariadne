"use client";

import { ShieldCheck } from "lucide-react";
import { OperatorGate } from "@/components/operator-gate";
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
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-nyx px-6 py-8 scanlines">
      <OperatorGate
        title="Door check-in"
        Icon={ShieldCheck}
        description="Match guests at the door against tonight's list and see who's already inside. Paste the staff token once to open the door board."
        value={input}
        onChange={setInput}
        onUnlock={unlock}
        action="open"
      />
    </main>
  );
}
