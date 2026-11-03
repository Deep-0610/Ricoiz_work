import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyTwilioSignature({ authToken, signature, url, params }) {
  if (!authToken || !signature || !url || !params || typeof params !== "object") return false;
  const canonical = Object.keys(params).sort().reduce((value, key) => {
    const item = Array.isArray(params[key]) ? params[key].join("") : String(params[key] ?? "");
    return value + key + item;
  }, url);
  const expected = createHmac("sha1", authToken).update(canonical, "utf8").digest("base64");
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function renderSmsTemplate(template, customer, business) {
  const allowed = new Set(["firstName", "businessName"]);
  const tokens = [...String(template || "").matchAll(/{{\s*([a-zA-Z]+)\s*}}/g)];
  for (const token of tokens) {
    if (!allowed.has(token[1])) throw new Error(`Unsupported SMS template variable: ${token[1]}`);
  }
  return String(template || "")
    .replace(/{{\s*firstName\s*}}/g, String(customer?.firstName || "there"))
    .replace(/{{\s*businessName\s*}}/g, String(business?.businessName || "our team"))
    .trim();
}

export function normalizeTwilioStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["queued", "accepted", "sending"].includes(value)) return "queued";
  if (["sent"].includes(value)) return "sent";
  if (["delivered", "read"].includes(value)) return "delivered";
  if (["failed", "undelivered", "canceled"].includes(value)) return "failed";
  return null;
}
