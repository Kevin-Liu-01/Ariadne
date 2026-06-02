import { env } from "@/lib/env";
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
  return (
    <main className="relative flex min-h-screen flex-1 flex-col bg-nyx px-6 py-8 scanlines">
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

          <CheckInPanel phoneNumber={env.agentphone.phoneNumber} stationId={sp.station_id ?? null} />
        </div>
      </div>
    </main>
  );
}
