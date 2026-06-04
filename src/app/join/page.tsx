import { ArrowRight, UserPlus } from "lucide-react";
import { env } from "@/lib/env";
import { contactCardIntroCopy } from "@/constants/contact-card";
import { EVENT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { SiteNav } from "@/components/site-nav";
import { CheckInPanel } from "@/app/join/check-in-panel";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ station_id?: string }>;
}) {
  const sp = await searchParams;
  const phoneNumber = env.agentphone.phoneNumber;
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col bg-nyx px-6 py-8 scanlines">
      <SiteNav className="relative z-[2] justify-center" />
      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md animate-rise">
          <div className="flex justify-center">
            <LabyrinthThread size={92} animate />
          </div>
          <p className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-ash">
            {EVENT_NAME} · {VENUE}
          </p>
          <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight">Check in</h1>
          <p className="mt-2 text-center text-sm text-helio">{PRODUCT_TAGLINE}</p>

          <CheckInPanel phoneNumber={phoneNumber} stationId={sp.station_id ?? null} />

          {phoneNumber ? (
            <div className="mt-8 border-t border-nyx-line/60 pt-6">
              <p className="text-center text-sm leading-relaxed text-ash">{contactCardIntroCopy()}</p>
              <a
                href="/ariadne.vcf"
                className="group mt-4 flex items-center justify-between gap-3 border border-nyx-line/70 bg-nyx/50 px-5 py-4 text-sm text-ash transition-colors hover:border-helio/50 hover:text-cloud"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
                  Save contact card
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
