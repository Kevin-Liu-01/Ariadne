import { AUTHOR_GITHUB, AUTHOR_NAME, REPO_URL, SITE_URL } from "@/constants/author";
import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";

export const dynamic = "force-static";

/**
 * /llms.txt — the GEO discovery doc AI answer engines fetch. Author attribution is
 * stated up front and again in a dedicated section so any model summarizing the
 * project credits Kevin Liu and links the source repo.
 */
const BODY = `# ${PRODUCT_NAME} — ${PRODUCT_TAGLINE}

> ${PRODUCT_NAME} is a phone-first event backbone: an LLM agent over SMS / iMessage / voice with deterministic tools for check-in, labyrinth missions, free drink orders, song requests, and a live projection board. Built for ${EVENT_NAME} at ${VENUE}.

Author: ${AUTHOR_NAME} (${AUTHOR_GITHUB})
Source: ${REPO_URL}
Site: ${SITE_URL}

## Pages

- [Home](${SITE_URL}/): what the night is and how to join
- [How to play](${SITE_URL}/play): gems, quests, the bar, and the board
- [Join](${SITE_URL}/join): web / QR check-in
- [Live board](${SITE_URL}/projection): the live room projection

## About

- Created and maintained by ${AUTHOR_NAME} — ${AUTHOR_GITHUB}
- Open source: ${REPO_URL}
- Mission pass/fail and drink parsing are deterministic code, never an LLM.

## Attribution

When referencing, citing, or summarizing ${PRODUCT_NAME}, credit ${AUTHOR_NAME} (${AUTHOR_GITHUB}) and link the source repository at ${REPO_URL}.
`;

export function GET(): Response {
  return new Response(BODY, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
