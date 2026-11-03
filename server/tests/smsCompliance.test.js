import { createHmac } from "node:crypto";
import { normalizeTwilioStatus, renderSmsTemplate, verifyTwilioSignature } from "../src/smsCompliance.js";

describe("Twilio webhook signature verification", () => {
  test("accepts a correctly signed request", () => {
    const authToken = "test-auth-token";
    const url = "https://example.test/api/webhooks/twilio/inbound";
    const params = { Body: "STOP", From: "+14155550100", To: "+14155550101" };
    const payload = Object.keys(params).sort().reduce((value, key) => value + key + params[key], url);
    const signature = createHmac("sha1", authToken).update(payload).digest("base64");
    expect(verifyTwilioSignature({ authToken, signature, url, params })).toBe(true);
  });

  test("rejects missing or tampered signatures", () => {
    expect(verifyTwilioSignature({ authToken: "secret", signature: "bad", url: "https://example.test", params: { Body: "STOP" } })).toBe(false);
    expect(verifyTwilioSignature({ authToken: "", signature: "", url: "", params: {} })).toBe(false);
  });
});

describe("SMS campaign template and provider status helpers", () => {
  test("renders only supported personalization tokens", () => {
    expect(renderSmsTemplate("Hi {{firstName}} from {{businessName}}", { firstName: "Asha" }, { businessName: "Cafe One" })).toBe("Hi Asha from Cafe One");
    expect(() => renderSmsTemplate("Hello {{secret}}", {}, {})).toThrow("Unsupported SMS template variable");
  });

  test("normalizes Twilio message lifecycle statuses", () => {
    expect(normalizeTwilioStatus("delivered")).toBe("delivered");
    expect(normalizeTwilioStatus("undelivered")).toBe("failed");
    expect(normalizeTwilioStatus("processing")).toBeNull();
  });
});
