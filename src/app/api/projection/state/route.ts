import { getBackbone } from "@/server/backbone";
import { json } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full board snapshot. The projection frontend recovers from this on reload. */
export async function GET(): Promise<Response> {
  return json(await getBackbone().projection.snapshot());
}
