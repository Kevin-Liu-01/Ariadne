import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildVcard, defaultAriadneVcard } from "@/server/contact/vcard";

describe("vCard contact identity", () => {
  it("uses FN only so iOS does not show N-field semicolons", () => {
    const vcf = buildVcard({
      displayName: "Ariadne",
      phone: "+18159970034",
      organization: "Dedalus Labs",
      title: "Run(time)way",
      note: "the thread",
      url: "https://ariadne-runway.vercel.app",
    });
    expect(vcf).toContain("FN:Ariadne");
    expect(vcf).not.toMatch(/^N:/m);
    expect(vcf).not.toContain(";Ariadne");
  });

  it("embeds the labyrinth mark as base64 PNG", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const vcf = buildVcard({
      displayName: "Ariadne",
      phone: "+18159970034",
      organization: "Dedalus Labs",
      title: "Run(time)way",
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

  it("omits the structured N field so iMessage shows a clean FN, not semicolons", () => {
    const vcf = defaultAriadneVcard("+18159970034", "https://ariadne-runway.vercel.app", Buffer.from("x"));
    // iMessage rendered N's "Family;Given;;;" slots literally (semicolons and all),
    // so the default card carries FN only and never an N line.
    expect(vcf).toContain("FN:Ariadne Agent");
    expect(vcf).not.toMatch(/^N:/m);
    expect(vcf).not.toContain(";;;");
  });
});
