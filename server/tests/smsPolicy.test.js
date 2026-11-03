import { describe, expect, test } from "@jest/globals";
import { isWithinSmsWindow, validateSmsRecipient } from "../src/workers/smsPolicy.js";

describe("SMS compliance policy", () => {
  test("allows delivery only inside the configured local daytime window", () => {
    expect(isWithinSmsWindow("Asia/Kolkata", new Date("2026-11-03T04:30:00.000Z"))).toBe(true);
    expect(isWithinSmsWindow("Asia/Kolkata", new Date("2026-11-03T16:00:00.000Z"))).toBe(false);
  });

  test("blocks recipients without explicit, timestamped consent", () => {
    expect(validateSmsRecipient({ phone: "+919876543210", consentStatus: "unknown" }, "Asia/Kolkata", new Date("2026-11-03T04:30:00Z")))
      .toEqual({ allowed: false, reason: "documented_consent_required" });
  });

  test("blocks revoked or opted-out recipients", () => {
    expect(validateSmsRecipient({ phone: "+919876543210", consentStatus: "granted", consentAt: new Date(), optedOutAt: new Date() }, "Asia/Kolkata", new Date("2026-11-03T04:30:00Z")))
      .toEqual({ allowed: false, reason: "opted_out" });
  });

  test("blocks invalid timezone and malformed phone numbers", () => {
    expect(isWithinSmsWindow("Not/A_Timezone", new Date())).toBe(false);
    expect(validateSmsRecipient({ phone: "98765", consentStatus: "granted", consentAt: new Date() }, "Asia/Kolkata", new Date("2026-11-03T04:30:00Z")))
      .toEqual({ allowed: false, reason: "invalid_phone" });
  });

  test("allows a documented, opted-in E.164 recipient during local daytime", () => {
    expect(validateSmsRecipient({ phone: "+919876543210", consentStatus: "granted", consentAt: new Date() }, "Asia/Kolkata", new Date("2026-11-03T04:30:00Z")))
      .toEqual({ allowed: true });
  });
});
