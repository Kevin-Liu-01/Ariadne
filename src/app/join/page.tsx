import { env } from "@/lib/env";
import { PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { RunwayWordmark } from "@/components/runway-wordmark";
import { TextReminders } from "@/components/text-reminders";
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
    <main className="relative flex min-h-dvh flex-1 flex-col bg-nyx px-6 py-6 scanlines">
      <SiteNav className="relative z-[2] justify-center" />
      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center py-8">
        {/* A contact card for Ariadne: identity up top, the check-in action and
            textable reminders below, like saving a contact then messaging it. */}
        <div className="w-full max-w-md animate-rise overflow-hidden border border-nyx-line bg-nyx-soft/70 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
          <header className="bgimg-nyx-waves relative border-b border-nyx-line px-6 pb-7 pt-9 text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-nyx/70 via-nyx/40 to-nyx-soft/90" />
            <div className="relative z-[2] flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-helio/40 bg-nyx/70 backdrop-blur-sm">
                <LabyrinthThread size={62} animate />
              </div>
              <h1 className="mt-4 font-display text-4xl font-extralight tracking-tight text-cloud">
                {PRODUCT_NAME}
              </h1>
              <p className="mt-1 text-sm text-helio">{PRODUCT_TAGLINE}</p>
              <div className="mt-4 flex flex-col items-center gap-1">
                <RunwayWordmark size="sm" />
                <p className="text-[11px] uppercase tracking-[0.3em] text-ash">{VENUE}</p>
              </div>
            </div>
          </header>

          <div className="px-6 pb-8">
            <CheckInPanel phoneNumber={phoneNumber} stationId={sp.station_id ?? null} />

            {phoneNumber ? (
              <div className="mt-8 border-t border-nyx-line/60 pt-6">
                <TextReminders title="once you're in, text Ariadne to" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
