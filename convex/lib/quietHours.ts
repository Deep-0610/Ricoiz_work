import { timezoneForPhone } from "./npaTz";

// Federal TCPA: 8AM-9PM recipient local time.
// State overrides (stricter): FL/CT/MD/OK/WA cap at 8PM.
// Texas: 9AM-9PM Mon-Sat, noon-9PM Sunday.

const STATE_END_8PM = new Set(["FL", "CT", "MD", "OK", "WA"]);

// Approximate state from NPA area code (limited — use for override only, not primary logic)
const NPA_STATE: Record<string, string> = {
  // Florida (partial)
  "305": "FL", "321": "FL", "352": "FL", "386": "FL", "407": "FL", "561": "FL",
  "689": "FL", "727": "FL", "754": "FL", "772": "FL", "786": "FL", "813": "FL",
  "850": "FL", "863": "FL", "904": "FL", "941": "FL", "954": "FL",
  // Connecticut
  "203": "CT", "475": "CT", "860": "CT", "959": "CT",
  // Maryland
  "240": "MD", "301": "MD", "410": "MD", "443": "MD", "667": "MD",
  // Oklahoma
  "405": "OK", "539": "OK", "572": "OK", "580": "OK", "918": "OK",
  // Washington
  "206": "WA", "253": "WA", "360": "WA", "425": "WA", "509": "WA", "564": "WA",
  // Texas (partial)
  "210": "TX", "214": "TX", "254": "TX", "281": "TX", "325": "TX", "346": "TX",
  "361": "TX", "409": "TX", "430": "TX", "432": "TX", "469": "TX", "512": "TX",
  "682": "TX", "713": "TX", "737": "TX", "806": "TX", "817": "TX", "830": "TX",
  "832": "TX", "903": "TX", "915": "TX", "936": "TX", "940": "TX", "956": "TX",
  "972": "TX", "979": "TX",
};

interface QuietHoursConfig {
  start: number; // hour 0-23
  end: number;
}

/**
 * Get quiet hours window for a phone number.
 * Falls back to federal default (8AM-9PM) if state unknown.
 */
export function quietHoursFor(phone: string, now: Date = new Date()): QuietHoursConfig {
  const clean = phone.replace(/[^0-9]/g, "");
  const withoutCountry = clean.startsWith("1") && clean.length === 11 ? clean.substring(1) : clean;
  const npa = withoutCountry.substring(0, 3);
  const state = NPA_STATE[npa];

  if (state === "TX") {
    // Get day of week in that timezone
    const tz = timezoneForPhone(phone);
    const dayStr = now.toLocaleString("en-US", { timeZone: tz, weekday: "short" });
    const isSunday = dayStr === "Sun";
    return isSunday ? { start: 12, end: 21 } : { start: 9, end: 21 };
  }

  if (state && STATE_END_8PM.has(state)) {
    return { start: 8, end: 20 };
  }

  // Federal default
  return { start: 8, end: 21 };
}

/**
 * Check if it's currently OK to send SMS to this phone (within allowed hours).
 *
 * IMPORTANT NAMING FIX 2026-07-11: This function was named `isInQuietHours` but
 * its logic returned TRUE for the ALLOWED window (opposite of what the name
 * suggested). Renamed to `isInAllowedWindow` and legacy alias kept for
 * backwards-compat. Callers should migrate to `isInAllowedWindow` for clarity.
 */
export function isInAllowedWindow(phone: string, clientTimezone: string = "America/New_York", now: Date = new Date()): boolean {
  const tz = timezoneForPhone(phone, clientTimezone);
  const localHour = parseInt(
    now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: tz }),
    10
  );
  const { start, end } = quietHoursFor(phone, now);
  return localHour >= start && localHour < end;
}

/**
 * @deprecated Misleading name — use `isInAllowedWindow` instead.
 * Returns TRUE when SMS is ALLOWED (NOT during quiet hours). Kept for backwards compatibility.
 */
export const isInQuietHours = isInAllowedWindow;
