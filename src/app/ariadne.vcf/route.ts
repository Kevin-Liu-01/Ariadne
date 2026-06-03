import { env } from "@/lib/env";
import { defaultAriadneVcard } from "@/server/contact/vcard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public vCard for iMessage/SMS contact save (Dench-style identity on the thread). */
export async function GET(): Promise<Response> {
  const phone = env.agentphone.phoneNumber;
  if (!phone) return new Response("phone not configured", { status: 503 });

  const body = defaultAriadneVcard(phone, env.publicBaseUrl);
  return new Response(body, {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": 'attachment; filename="ariadne.vcf"',
      "cache-control": "public, max-age=3600",
    },
  });
}
