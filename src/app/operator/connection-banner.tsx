"use client";

import { AlertTriangle, Wifi } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authedFetch } from "@/app/operator/api";
import { cn } from "@/lib/utils";

type ConnState = "checking" | "live" | "unauthorized" | "offline";

/** Polls operator auth so a stale localStorage token cannot look like an empty room. */
export function ConnectionBanner({ token }: { token: string }) {
  const [state, setState] = useState<ConnState>("checking");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(0);

  const ping = useCallback(async () => {
    try {
      const res = await authedFetch(token, "/api/operator/participants");
      if (res.status === 401) {
        setState("unauthorized");
        return;
      }
      if (!res.ok) {
        setState("offline");
        return;
      }
      const data = (await res.json()) as { participants: unknown[] };
      setGuestCount(data.participants.length);
      setState("live");
      setCheckedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }));
    } catch {
      setState("offline");
    }
  }, [token]);

  useEffect(() => {
    ping();
    const t = setInterval(ping, 8000);
    return () => clearInterval(t);
  }, [ping]);

  if (state === "checking") return null;

  if (state === "unauthorized") {
    return (
      <div className="mb-4 flex items-start gap-2 border border-gem-garnet/60 bg-gem-garnet/10 px-4 py-3 text-sm text-cloud">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gem-garnet" strokeWidth={1.5} aria-hidden />
        <p>
          Token rejected. Lock the console and paste the production{" "}
          <span className="text-helio">ARIADNE_OPERATOR_TOKEN</span> from Vercel (not{" "}
          <span className="tabular-nums">operator-dev</span>).
        </p>
      </div>
    );
  }

  if (state === "offline") {
    return (
      <div className="mb-4 flex items-start gap-2 border border-gem-topaz/60 bg-gem-topaz/10 px-4 py-3 text-sm text-cloud">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gem-topaz" strokeWidth={1.5} aria-hidden />
        <p>Cannot reach the operator API. Check network and try again.</p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between text-xs text-ash">
      <span className="flex items-center gap-1.5">
        <Wifi className={cn("h-3.5 w-3.5 text-gem-peridot")} strokeWidth={1.5} aria-hidden />
        live · {guestCount} guest{guestCount === 1 ? "" : "s"} checked in
      </span>
      {checkedAt ? <span className="tabular-nums">synced {checkedAt}</span> : null}
    </div>
  );
}
