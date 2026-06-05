import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildVcard, defaultAriadneVcard } from "@/server/contact/vcard";

describe("vCard contact identity", () => {
  it("emits a structured N with raw separators so iOS shows a person name", () => {
    const vcf = buildVcard({
      displayName: "Ariadne",
      phone: "+18159970034",
      organization: "Dedalus Labs",
      title: "Run(way)time",
      note: "the thread",
      url: "https://ariadne-runway.vercel.app",
    });
    expect(vcf).toContain("FN:Ariadne");
    // A single-token name goes in the given slot; the four ";" component
    // separators stay raw (escaping them is what made iMessage show literal
    // semicolons and fall back to the ORG as the contact name).
    expect(vcf).toMatch(/^N:/m);
    expect(vcf).toContain("N:;Ariadne;;;");
    expect(vcf).not.toContain("\\;");
  });

  it("embeds the labyrinth mark as base64 PNG", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const vcf = buildVcard({
      displayName: "Ariadne",
      phone: "+18159970034",
      organization: "Dedalus Labs",
      title: "Run(way)time",
      note: "the thread",
      url: "https://ariadne-runway.vercel.app",
      photoPng: png,
    });
    expect(vcf).toContain("PHOTO;ENCODING=b;TYPE=PNG:");
    expect(vcf).toContain("iVBOR");
  });

  it("builds the default Ariadne Agent card", () => {
    const vcf = defaultAriadneVcard("+18159970034", "https://ariadne-runway.vercel.app", Buffer.from("x"));
    expect(vcf).toContain("FN:Ariadne Agent");
    expect(vcf).toContain("ORG:Dedalus Labs");
  });

  it("keeps the real served contact card lean enough for an MMS attachment", () => {
    // The contact photo is the only thing that can bloat the card; a heavy avatar
    // produces a vCard that iMessage renders but the SMS/MMS fallback may drop.
    // Guard the shipped asset so it stays a thumbnail, not a full 512px render.
    const photoPng = readFileSync(join(process.cwd(), "src/app/contact-avatar.png"));
    const vcf = defaultAriadneVcard("+18159970034", "https://ariadne-runway.vercel.app", photoPng);
    expect(vcf).toContain("BEGIN:VCARD");
    expect(vcf).toContain("END:VCARD");
    expect(vcf).toContain("PHOTO;ENCODING=b;TYPE=PNG:");
    expect(Buffer.byteLength(vcf, "utf8")).toBeLessThan(24_000);
  });

  it("carries a person name (N + FN) so iOS does not render an org-only company card", () => {
    const vcf = defaultAriadneVcard("+18159970034", "https://ariadne-runway.vercel.app", Buffer.from("x"));
    // Last token is the family name, the rest is the given name: "Ariadne Agent"
    // => N:Agent;Ariadne;;;. Without N, iOS treats an ORG-bearing card as a
    // company and shows "Dedalus Labs" (and a blank avatar) instead.
    expect(vcf).toContain("N:Agent;Ariadne;;;");
    expect(vcf).toContain("FN:Ariadne Agent");
    expect(vcf).toContain("ORG:Dedalus Labs");
    expect(vcf).not.toContain("\\;");
  });
});
