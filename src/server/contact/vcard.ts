import { EVENT_NAME, PRODUCT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";

export interface VcardInput {
  displayName: string;
  phone: string;
  organization: string;
  title: string;
  note: string;
  url: string;
  photoUrl?: string;
}

/** Escape text for a vCard 3.0 property value. */
function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

/** Fold long lines at 75 octets per RFC 2426. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

function property(key: string, value: string): string {
  return fold(`${key}:${escape(value)}`);
}

/** Build a vCard 3.0 document guests can save from iMessage or SMS. */
export function buildVcard(input: VcardInput): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    property("FN", input.displayName),
    property("N", `;${input.displayName};;;`),
    property("ORG", input.organization),
    property("TITLE", input.title),
    property("TEL;TYPE=CELL", input.phone),
    property("URL", input.url),
    property("NOTE", input.note),
  ];
  if (input.photoUrl) lines.push(property("PHOTO;VALUE=URI", input.photoUrl));
  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

/** Default Ariadne contact card for the active event line. */
export function defaultAriadneVcard(phone: string, publicBaseUrl: string): string {
  const base = publicBaseUrl.replace(/\/$/, "");
  return buildVcard({
    displayName: PRODUCT_NAME,
    phone,
    organization: "Dedalus Labs",
    title: EVENT_NAME,
    note: `${PRODUCT_TAGLINE} · ${VENUE}`,
    url: base,
    photoUrl: `${base}/icon.png`,
  });
}
