import { AUTHOR_GITHUB, AUTHOR_NAME, REPO_URL, SITE_URL } from "@/constants/author";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";

/**
 * schema.org JSON-LD for SEO + GEO (AI search engines). The author is a Person
 * with `sameAs` pointing at the GitHub profile + repo, and is reused as creator
 * and publisher across the WebSite and WebApplication nodes so every crawler and
 * answer engine attributes the project to the same identity.
 */
export function StructuredData() {
  const author = {
    "@type": "Person",
    "@id": `${SITE_URL}/#author`,
    name: AUTHOR_NAME,
    url: AUTHOR_GITHUB,
    sameAs: [AUTHOR_GITHUB, REPO_URL],
  } as const;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: `${PRODUCT_NAME} · ${EVENT_NAME}`,
        description: `${PRODUCT_TAGLINE}, a phone-first game for ${EVENT_NAME}.`,
        inLanguage: "en",
        author: { "@id": author["@id"] },
        creator: { "@id": author["@id"] },
        publisher: { "@id": author["@id"] },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: PRODUCT_NAME,
        url: SITE_URL,
        applicationCategory: "EntertainmentApplication",
        operatingSystem: "Web, iMessage, SMS, Voice",
        description: `${PRODUCT_NAME}: ${PRODUCT_TAGLINE}. A phone-first event backbone built for ${EVENT_NAME} at ${VENUE}.`,
        isAccessibleForFree: true,
        codeRepository: REPO_URL,
        author: { "@id": author["@id"] },
        creator: { "@id": author["@id"] },
        publisher: { "@id": author["@id"] },
      },
      author,
    ],
  };

  // JSON-LD must be injected as raw text. The content is build-time constant
  // (never user input); `<` is escaped so the payload can't close the script tag.
  const json = JSON.stringify(graph).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
