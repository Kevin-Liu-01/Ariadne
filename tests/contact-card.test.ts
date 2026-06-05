import { describe, expect, it } from "vitest";
import {
  contactCardMediaUrl,
  firstContactMessageBody,
} from "@/server/partners/agentphone/contact-card";
import { contactCardIntroCopy } from "@/constants/copy";

describe("contact card delivery", () => {
  it("builds the first outbound bubble with intro + reply", () => {
    const body = firstContactMessageBody("What is your first name?");
    expect(body).toContain(contactCardIntroCopy());
    expect(body).toContain("What is your first name?");
    expect(body).toContain("Ariadne Agent");
  });

  it("points at the public vCard when a line number is configured", () => {
    const prev = process.env.AGENTPHONE_PHONE_NUMBER;
    process.env.AGENTPHONE_PHONE_NUMBER = "+18159970034";
    process.env.ARIADNE_PUBLIC_BASE_URL = "https://ariadne-runway.vercel.app";
    try {
      expect(contactCardMediaUrl()).toBe("https://ariadne-runway.vercel.app/ariadne.vcf");
    } finally {
      if (prev === undefined) delete process.env.AGENTPHONE_PHONE_NUMBER;
      else process.env.AGENTPHONE_PHONE_NUMBER = prev;
    }
  });

  it("returns null when the line number is unset", () => {
    const prev = process.env.AGENTPHONE_PHONE_NUMBER;
    delete process.env.AGENTPHONE_PHONE_NUMBER;
    try {
      expect(contactCardMediaUrl()).toBeNull();
    } finally {
      if (prev !== undefined) process.env.AGENTPHONE_PHONE_NUMBER = prev;
    }
  });
});
