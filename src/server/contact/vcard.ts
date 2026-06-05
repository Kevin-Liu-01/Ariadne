import { CONTACT_NAME, EVENT_NAME, PRODUCT_TAGLINE, VENUE } from "@/constants/event";

export interface VcardInput {
  displayName: string;
  phone: string;
  organization: string;
  title: string;
  note: string;
  url: string;
  /** PNG bytes embedded in the card. Remote PHOTO URIs are unreliable over SMS. */
  photoPng?: Buffer;
}

/** Escape text for a vCard 3.0 property value, including `;` (used for FN, ORG, NOTE, ...). */
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

/**
 * Structured N derived from the display name: the last whitespace token is the
 * family name, the rest is the given name ("Ariadne Agent" -> N:Agent;Ariadne;;;).
 * The four ";" component separators are structural and stay raw; only the values
 * are escaped. iOS needs a valid N to treat the card as a person -- with an ORG
 * and no N it renders a company card (org as the name, blank circular avatar).
 */
function structuredNameLine(displayName: string): string {
  const tokens = displayName.trim().split(/\s+/);
  const family = tokens.length > 1 ? tokens[tokens.length - 1] : "";
  const given = tokens.length > 1 ? tokens.slice(0, -1).join(" ") : displayName.trim();
  return fold(`N:${escape(family)};${escape(given)};;;`);
}

/** Fold base64 PHOTO data after the property header line. */
function photoBase64Property(png: Buffer): string {
  const b64 = png.toString("base64");
  const header = "PHOTO;ENCODING=b;TYPE=PNG:";
  const firstTake = Math.max(0, 75 - header.length);
  const lines = [header + b64.slice(0, firstTake)];
  let offset = firstTake;
  while (offset < b64.length) {
    lines.push(` ${b64.slice(offset, offset + 74)}`);
    offset += 74;
  }
  return lines.join("\r\n");
}

/**
 * Build a vCard 3.0 document guests can save from iMessage or SMS. Carries both a
 * structured N (raw ";" separators) and a formatted FN: the N marks it as a person
 * card so iOS shows the display name and the embedded photo, instead of treating an
 * ORG-bearing card as a company (org name, blank avatar). Escaping N's separators is
 * what previously made iMessage show literal semicolons, so they are kept raw here.
 */
export function buildVcard(input: VcardInput): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    structuredNameLine(input.displayName),
    property("FN", input.displayName),
    property("ORG", input.organization),
    property("TITLE", input.title),
    property("TEL;TYPE=CELL", input.phone),
    property("URL", input.url),
    property("NOTE", input.note),
  ];
  if (input.photoPng && input.photoPng.length > 0) lines.push(photoBase64Property(input.photoPng));
  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

/** Default Ariadne contact card for the active event line. */
export function defaultAriadneVcard(phone: string, publicBaseUrl: string, photoPng: Buffer): string {
  const base = publicBaseUrl.replace(/\/$/, "");
  return buildVcard({
    displayName: CONTACT_NAME,
    phone,
    organization: "Dedalus Labs",
    title: EVENT_NAME,
    note: `${PRODUCT_TAGLINE} · ${VENUE}`,
    url: base,
    photoPng,
  });
}
