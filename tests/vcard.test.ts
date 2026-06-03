import { describe, expect, it } from "vitest";
import { buildVcard, defaultAriadneVcard } from "@/server/contact/vcard";

describe("vCard contact identity", () => {
  it("uses FN only so iOS does not show N-field semicolons", () => {
    const vcf = buildVcard({
      displayName: "Ariadne",
      phone: "+18159970034",
      organization: "Dedalus Labs",
      title: "Run(way)time",
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
      title: "Run(way)time",
      note: "the thread",
      url: "https://ariadne-runway.vercel.app",
      photoPng: png,
    });
    expect(vcf).toContain("PHOTO;ENCODING=b;TYPE=PNG:");
    expect(vcf).toContain("iVBOR");
  });

  it("builds the default Ariadne card", () => {
    const vcf = defaultAriadneVcard("+18159970034", "https://ariadne-runway.vercel.app", Buffer.from("x"));
    expect(vcf).toContain("FN:Ariadne");
    expect(vcf).toContain("ORG:Dedalus Labs");
  });
});
