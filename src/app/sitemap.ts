import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/author";

/** Public, indexable routes. Staff/room surfaces and API endpoints are intentionally omitted. */
const ROUTES = ["/", "/join", "/play", "/play/live", "/projection"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((path): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
