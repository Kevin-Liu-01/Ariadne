import { describe, expect, it } from "vitest";
import { buildVcard, defaultAriadneVcard } from "@/server/contact/vcard";

describe("vCard contact identity", () => {
  it("includes name, phone, and org", () => {
    const vcf = buildVcard({
      displayName: "Ariadne",
      phone: "+18159970034",
      organization: "Dedalus Labs",
      title: "Run(way)time",
      note: "the thread",
      url: "https://ariadne-runway.vercel.app",
      photoUrl: "https://ariadne-runway.vercel.app/icon.png",
    });
    expect(vcf).toContain("BEGIN:VCARD");
    expect(vcf).toContain("FN:Ariadne");
    expect(vcf).toContain("TEL;TYPE=CELL:+18159970034");
    expect(vcf).toContain("ORG:Dedalus Labs");
    expect(vcf).toContain("PHOTO;VALUE=URI:https://ariadne-runway.vercel.app/icon.png");
    expect(vcf).toContain("END:VCARD");
  });

  it("builds the default Ariadne card from the public base URL", () => {
    const vcf = defaultAriadneVcard("+18159970034", "https://ariadne-runway.vercel.app");
    expect(vcf).toContain("FN:Ariadne");
    expect(vcf).toContain("/icon.png");
  });
});
