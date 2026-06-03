import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { contactCardIntroCopy } from "@/constants/contact-card";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";
import { env } from "@/lib/env";
import { LabyrinthThread } from "@/components/labyrinth-thread";
import { SiteNav } from "@/components/site-nav";

export const dynamic = "force-dynamic";

export default function SmsPage() {
  const phone = env.agentphone.phoneNumber;
  const vcfHref = "/ariadne.vcf";
  const smsHref = phone ? `sms:${phone}?&body=JOIN` : null;

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col bg-nyx px-6 py-8 scanlines">
      <SiteNav className="relative z-[2] justify-center" />
      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md animate-rise text-center">
          <div className="flex justify-center">
            <LabyrinthThread size={92} animate />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-ash">
            {EVENT_NAME} · {VENUE}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Text {PRODUCT_NAME}</h1>
          <p className="mt-2 text-sm text-helio">{PRODUCT_TAGLINE}</p>
          <p className="mt-6 text-sm leading-relaxed text-cloud">{contactCardIntroCopy()}</p>

          <div className="mt-8 flex flex-col gap-3">
            <a
              href={vcfHref}
              className="group flex items-center justify-between gap-3 border border-helio/50 bg-helio/15 px-5 py-4 transition-colors hover:bg-helio/25"
            >
              <span className="text-left text-sm font-medium text-cloud">Save contact card</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-helio transition-transform group-hover:translate-x-0.5" />
            </a>
            {smsHref ? (
              <a
                href={smsHref}
                className="group flex items-center justify-between gap-3 border border-nyx-line/70 bg-nyx/50 px-5 py-4 text-sm text-ash transition-colors hover:border-helio/50 hover:text-cloud"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-helio" strokeWidth={1.5} aria-hidden />
                  Text {phone}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </a>
            ) : null}
          </div>

          <p className="mt-8 text-xs text-ash">
            Already here?{" "}
            <Link href="/join" className="text-helio underline-offset-4 hover:underline">
              Check in on the web
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
