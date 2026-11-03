const E164 = /^\+[1-9]\d{7,14}$/;

export function isWithinSmsWindow(timeZone, now = new Date()) {
  let hour;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      hour: "2-digit",
      hourCycle: "h23"
    }).formatToParts(now);
    hour = Number(parts.find(part => part.type === "hour")?.value);
  } catch {
    return false;
  }
  // Conservative default: only send from 09:00 through 19:59 local time.
  return Number.isInteger(hour) && hour >= 9 && hour < 20;
}

export function validateSmsRecipient(customer, timeZone, now = new Date()) {
  if (!customer) return { allowed: false, reason: "customer_not_found" };
  if (customer.optedOutAt || customer.consentStatus === "revoked") {
    return { allowed: false, reason: "opted_out" };
  }
  if (customer.consentStatus !== "granted" || !customer.consentAt) {
    return { allowed: false, reason: "documented_consent_required" };
  }
  if (!E164.test(String(customer.phone || ""))) {
    return { allowed: false, reason: "invalid_phone" };
  }
  if (!isWithinSmsWindow(timeZone, now)) {
    return { allowed: false, reason: "quiet_hours" };
  }
  return { allowed: true };
}
