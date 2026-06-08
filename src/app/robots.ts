import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/author";

/** Allow crawlers + AI agents across public surfaces; keep the API and staff console out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/operator"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
