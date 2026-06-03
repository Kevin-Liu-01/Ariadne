import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "@/lib/env";
import { defaultAriadneVcard } from "@/server/contact/vcard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ICON_PATH = join(process.cwd(), "src/app/apple-icon.png");

/** Public vCard for iMessage/SMS contact save (Dench-style identity on the thread). */
export async function GET(): Promise<Response> {
  const phone = env.agentphone.phoneNumber;
  if (!phone) return new Response("phone not configured", { status: 503 });

  const photoPng = await readFile(ICON_PATH);
  const body = defaultAriadneVcard(phone, env.publicBaseUrl, photoPng);
  return new Response(body, {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": 'attachment; filename="ariadne.vcf"',
      "cache-control": "public, max-age=3600",
    },
  });
}
