/**
 * Pure conversion engine for the Timestamp converter. No React, no DOM
 * mutation, no module-level state. All exact-time math goes through Temporal
 * (native `Date` is used only as an Intl/formatting bridge or to read the
 * wall clock, never for arithmetic).
 */

import { Temporal } from "@js-temporal/polyfill";
import * as chrono from "chrono-node";
import { isHoliday, type HolidayCalendarId } from "./holidays";
import type {
  DetectedFormat,
  DurationParts,
  FormatOutputs,
  ParseResult,
  TimezoneView,
} from "./timestamp-converter.types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/** Fixed-offset stand-ins for common timezone abbreviations. */
const ABBREV_OFFSETS: Record<string, string> = {
  UTC: "+00:00", GMT: "+00:00",
  EST: "-05:00", EDT: "-04:00",
  PST: "-08:00", PDT: "-07:00",
  CET: "+01:00", CEST: "+02:00",
  BST: "+01:00", IST: "+05:30",
  JST: "+09:00", AEST: "+10:00", AEDT: "+11:00",
};

const EXCEL_EPOCH_MS = Temporal.Instant.from(
  "1899-12-30T00:00:00Z",
).epochMilliseconds;

// BigInt literals (`1000n`) require an ES2020 target; the repo targets
// lower, so we build the constants via the BigInt() constructor instead.
const NS_PER_SECOND = BigInt(1_000_000_000);
const NS_PER_MICROSECOND = BigInt(1000);
const US_TO_NS = BigInt(1000);

// ── Internal helpers ──────────────────────────────────────────────────────────

function stripWrapping(raw: string): string {
  let s = raw.trim();
  const pairs: [string, string][] = [
    ['"', '"'],
    ["'", "'"],
    ["`", "`"],
  ];
  for (const [a, b] of pairs) {
    if (s.length >= 2 && s.startsWith(a) && s.endsWith(b)) {
      s = s.slice(1, -1).trim();
      break;
    }
  }
  return s;
}

function instantFromUnixDigits(raw: string): {
  instant: Temporal.Instant;
  format: DetectedFormat;
} {
  const neg = raw.startsWith("-");
  const digits = raw.replace(/^[+-]/, "");
  const len = digits.length;
  if (len >= 18) {
    return { instant: Temporal.Instant.fromEpochNanoseconds(BigInt(raw)), format: "unix-ns" };
  }
  if (len >= 15) {
    return {
      instant: Temporal.Instant.fromEpochNanoseconds(BigInt(raw) * US_TO_NS),
      format: "unix-us",
    };
  }
  if (len >= 12) {
    return {
      instant: Temporal.Instant.fromEpochMilliseconds(Number(raw)),
      format: "unix-ms",
    };
  }
  void neg;
  return {
    instant: Temporal.Instant.fromEpochMilliseconds(Number(raw) * 1000),
    format: "unix-s",
  };
}

function excelSerialToInstant(serial: number): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(
    EXCEL_EPOCH_MS + Math.round(serial * 86_400_000),
  );
}

function utcZdt(instant: Temporal.Instant): Temporal.ZonedDateTime {
  return instant.toZonedDateTimeISO("UTC");
}

function pad(n: number, width = 2): string {
  return String(Math.abs(n)).padStart(width, "0");
}

// ── parseInput ────────────────────────────────────────────────────────────────

/**
 * Smart-paste parser: detects the timestamp format of arbitrary input and
 * returns the resolved exact moment.
 *
 * Handles Unix s/ms/µs/ns (by digit magnitude), ISO 8601 / RFC 3339,
 * RFC 2822, JS `Date.toString()`, log-style `YYYY-MM-DD HH:mm:ss`, common
 * timezone abbreviations, Excel serial numbers, and natural language
 * ("5 minutes ago"). Surrounding quotes/whitespace are ignored.
 *
 * @param raw - The user input.
 * @returns A {@link ParseResult}; `ok:false` with `error` when unparseable.
 * @example parseInput("1700123456").detectedFormat // "unix-s"
 * @example parseInput("yesterday at 3pm").ok // true
 */
export function parseInput(raw: string): ParseResult {
  const input = stripWrapping(raw);
  if (!input) {
    return {
      ok: false,
      detectedFormat: "unknown",
      rawInput: raw,
      error: "Empty input.",
    };
  }

  // Pure integer → Unix timestamp by magnitude.
  if (/^[+-]?\d+$/.test(input)) {
    try {
      const { instant, format } = instantFromUnixDigits(input);
      const digits = input.replace(/^[+-]/, "");
      const candidates: DetectedFormat[] = [format];
      const numeric = Number(digits);
      if (digits.length === 4 && numeric >= 1000 && numeric <= 9999) {
        candidates.push("natural-language"); // could be a bare year
      }
      if (
        !input.startsWith("-") &&
        digits.length >= 4 &&
        digits.length <= 5 &&
        numeric >= 1 &&
        numeric <= 60_000
      ) {
        candidates.push("excel-serial");
      }
      return {
        ok: true,
        instant,
        detectedFormat: format,
        rawInput: raw,
        ambiguous: candidates.length > 1,
        ambiguousCandidates: candidates.length > 1 ? candidates : undefined,
      };
    } catch (err) {
      return {
        ok: false,
        detectedFormat: "unknown",
        rawInput: raw,
        error: err instanceof Error ? err.message : "Invalid number.",
      };
    }
  }

  // Decimal number → Excel serial (with possible fractional-second ambiguity).
  if (/^\d+\.\d+$/.test(input)) {
    const value = Number(input);
    if (value > 0 && value < 60_000) {
      return {
        ok: true,
        instant: excelSerialToInstant(value),
        detectedFormat: "excel-serial",
        rawInput: raw,
        ambiguous: true,
        ambiguousCandidates: ["excel-serial", "unix-s"],
      };
    }
    return {
      ok: true,
      instant: Temporal.Instant.fromEpochMilliseconds(Math.round(value * 1000)),
      detectedFormat: "unix-s",
      rawInput: raw,
    };
  }

  // Format fingerprints for labelling.
  const rfc2822 =
    /^[A-Za-z]{3},?\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{1,2}:\d{2}(:\d{2})?\s+([+-]\d{4}|UT|GMT|Z|[A-Z]{1,5})/.test(
      input,
    );
  const jsDateString =
    /^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+GMT[+-]\d{4}/.test(
      input,
    );
  const logFormat =
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(input);
  const rfc3339Strict =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      input,
    );

  // Naive datetime (no zone) → interpret as UTC for determinism.
  if (logFormat) {
    try {
      const iso = input.replace(" ", "T") + "Z";
      return {
        ok: true,
        instant: Temporal.Instant.from(iso),
        detectedFormat: "log-format",
        rawInput: raw,
      };
    } catch {
      /* fall through to chrono */
    }
  }

  // ISO 8601 / RFC 3339 with explicit zone.
  try {
    const instant = Temporal.Instant.from(input);
    return {
      ok: true,
      instant,
      detectedFormat: rfc3339Strict ? "rfc-3339" : "iso-8601",
      rawInput: raw,
    };
  } catch {
    /* not a Temporal-parseable ISO string */
  }

  // Replace known abbreviations with numeric offsets, then natural-language.
  const replaced = input.replace(
    /\b(UTC|GMT|EST|EDT|PST|PDT|CET|CEST|BST|IST|JST|AEST|AEDT)\b/g,
    (m) => ABBREV_OFFSETS[m] ?? m,
  );
  const parsed = chrono.parseDate(replaced) ?? chrono.parseDate(input);
  if (parsed) {
    let detectedFormat: DetectedFormat = "natural-language";
    if (rfc2822) detectedFormat = "rfc-2822";
    else if (jsDateString) detectedFormat = "js-date-string";
    else if (logFormat) detectedFormat = "log-format";
    return {
      ok: true,
      instant: Temporal.Instant.fromEpochMilliseconds(parsed.getTime()),
      detectedFormat,
      rawInput: raw,
    };
  }

  return {
    ok: false,
    detectedFormat: "unknown",
    rawInput: raw,
    error: "Couldn't recognise this as a timestamp or date.",
  };
}

// ── Formatting ────────────────────────────────────────────────────────────────

/**
 * Produce every output representation of an instant.
 *
 * @param instant - The moment to format.
 * @param primaryTz - IANA zone for the primary ISO / locale output.
 * @param customFormat - Token string for the custom output.
 * @returns All format strings.
 * @example formatAll(i, "UTC", "YYYY-MM-DD").unixS
 */
export function formatAll(
  instant: Temporal.Instant,
  primaryTz: string,
  customFormat: string,
): FormatOutputs {
  const ns = instant.epochNanoseconds;
  const zdt = instant.toZonedDateTimeISO(primaryTz);
  return {
    unixS: (ns / NS_PER_SECOND).toString(),
    unixMs: instant.epochMilliseconds.toString(),
    unixUs: (ns / NS_PER_MICROSECOND).toString(),
    unixNs: ns.toString(),
    iso8601Primary: zdt.toString({ timeZoneName: "never" }),
    iso8601Utc: instant.toString(),
    rfc2822: toRfc2822(zdt),
    rfc3339: utcZdt(instant).toString({ timeZoneName: "never" }),
    localeString: new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: primaryTz,
    }).format(new Date(instant.epochMilliseconds)),
    customFormat: parseCustomFormat(instant, customFormat, primaryTz),
  };
}

function toRfc2822(zdt: Temporal.ZonedDateTime): string {
  const wd = WEEKDAYS[zdt.dayOfWeek - 1].slice(0, 3);
  const mon = MONTHS[zdt.month - 1].slice(0, 3);
  const off = zdt.offset.replace(":", "");
  return `${wd}, ${pad(zdt.day)} ${mon} ${zdt.year} ${pad(zdt.hour)}:${pad(
    zdt.minute,
  )}:${pad(zdt.second)} ${off}`;
}

/**
 * Build a {@link TimezoneView} for an instant in a given zone.
 *
 * @param instant - The moment.
 * @param iana - IANA timezone id.
 * @returns The per-zone view (offset, abbreviation, calendar fields, …).
 * @example getTimezoneView(i, "Asia/Dhaka").offset // "+06:00"
 */
export function getTimezoneView(
  instant: Temporal.Instant,
  iana: string,
): TimezoneView {
  const zdt = instant.toZonedDateTimeISO(iana);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: iana,
    timeZoneName: "short",
  }).formatToParts(new Date(instant.epochMilliseconds));
  const abbreviation =
    parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  const human = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: iana,
  }).format(new Date(instant.epochMilliseconds));
  return {
    iana,
    abbreviation,
    offset: zdt.offset,
    iso8601: zdt.toString({ timeZoneName: "never" }),
    human,
    dayOfWeek: WEEKDAYS[zdt.dayOfWeek - 1],
    dayOfYear: zdt.dayOfYear,
    weekOfYear: zdt.weekOfYear ?? 0,
    quarter: Math.ceil(zdt.month / 3),
    relativeTime: getRelativeTime(instant),
  };
}

/**
 * Human relative phrasing with auto unit selection.
 *
 * @param instant - The target moment.
 * @param now - Reference "now" (defaults to the wall clock).
 * @returns e.g. "2 hours ago", "in 3 days", "yesterday".
 * @example getRelativeTime(past) // "5 minutes ago"
 */
export function getRelativeTime(
  instant: Temporal.Instant,
  now: Temporal.Instant = Temporal.Now.instant(),
): string {
  const diffMs = instant.epochMilliseconds - now.epochMilliseconds;
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "just now";
}

// ── Arithmetic ────────────────────────────────────────────────────────────────

/**
 * Add a duration to an instant. Calendar units (days/months/years) are
 * applied in UTC, where every day is exactly 24h.
 *
 * @param instant - Base moment.
 * @param duration - Duration to add (may include calendar units).
 * @returns The resulting instant.
 * @example addDuration(i, Temporal.Duration.from({ days: 1 }))
 */
export function addDuration(
  instant: Temporal.Instant,
  duration: Temporal.Duration,
): Temporal.Instant {
  return utcZdt(instant).add(duration).toInstant();
}

/**
 * Subtract a duration from an instant (UTC calendar math).
 *
 * @param instant - Base moment.
 * @param duration - Duration to subtract.
 * @returns The resulting instant.
 * @example subtractDuration(i, Temporal.Duration.from({ hours: 2 }))
 */
export function subtractDuration(
  instant: Temporal.Instant,
  duration: Temporal.Duration,
): Temporal.Instant {
  return utcZdt(instant).subtract(duration).toInstant();
}

/**
 * Calendar-aware difference between two instants (computed in UTC).
 *
 * @param from - Start moment.
 * @param to - End moment.
 * @returns Decomposed and total durations plus a human phrase.
 * @example diffDuration(a, b).humanReadable // "2 days, 4 hours"
 */
export function diffDuration(
  from: Temporal.Instant,
  to: Temporal.Instant,
): DurationParts {
  const d = utcZdt(to).since(utcZdt(from), { largestUnit: "year" });
  const totalMs = to.epochMilliseconds - from.epochMilliseconds;
  const parts: [string, number][] = [
    ["year", d.years],
    ["month", d.months],
    ["day", d.days + d.weeks * 7],
    ["hour", d.hours],
    ["minute", d.minutes],
    ["second", d.seconds],
  ];
  const human =
    parts
      .filter(([, v]) => v !== 0)
      .map(([u, v]) => `${Math.abs(v)} ${u}${Math.abs(v) === 1 ? "" : "s"}`)
      .slice(0, 3)
      .join(", ") || "0 seconds";
  return {
    years: d.years,
    months: d.months,
    days: d.days + d.weeks * 7,
    hours: d.hours,
    minutes: d.minutes,
    seconds: d.seconds,
    totalSeconds: Math.trunc(totalMs / 1000),
    totalMs,
    humanReadable: human,
  };
}

type RoundUnit =
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year";
type RoundMode = "floor" | "ceil" | "nearest";

/**
 * Round an instant to a calendar boundary in a given timezone.
 *
 * @param instant - The moment.
 * @param unit - Boundary granularity.
 * @param mode - floor / ceil / nearest.
 * @param tz - IANA timezone the boundary is evaluated in.
 * @returns The rounded instant.
 * @example roundTo(i, "day", "floor", "UTC") // start of day
 */
export function roundTo(
  instant: Temporal.Instant,
  unit: RoundUnit,
  mode: RoundMode,
  tz: string,
): Temporal.Instant {
  const zdt = instant.toZonedDateTimeISO(tz);
  if (unit === "minute" || unit === "hour" || unit === "day") {
    const modeMap: Record<RoundMode, "halfExpand" | "floor" | "ceil"> = {
      nearest: "halfExpand",
      floor: "floor",
      ceil: "ceil",
    };
    return zdt
      .round({ smallestUnit: unit, roundingMode: modeMap[mode] })
      .toInstant();
  }

  const floorOf = (z: Temporal.ZonedDateTime): Temporal.ZonedDateTime => {
    if (unit === "week") {
      return z.subtract({ days: z.dayOfWeek - 1 }).startOfDay();
    }
    if (unit === "month") {
      return z.with({ day: 1 }).startOfDay();
    }
    if (unit === "quarter") {
      const qStartMonth = Math.floor((z.month - 1) / 3) * 3 + 1;
      return z.with({ month: qStartMonth, day: 1 }).startOfDay();
    }
    return z.with({ month: 1, day: 1 }).startOfDay(); // year
  };
  const next = (z: Temporal.ZonedDateTime): Temporal.ZonedDateTime => {
    if (unit === "week") return z.add({ weeks: 1 });
    if (unit === "month") return z.add({ months: 1 });
    if (unit === "quarter") return z.add({ months: 3 });
    return z.add({ years: 1 });
  };

  const lo = floorOf(zdt);
  if (mode === "floor") return lo.toInstant();
  const hi = next(lo);
  if (mode === "ceil") {
    return zdt.epochNanoseconds === lo.epochNanoseconds
      ? lo.toInstant()
      : hi.toInstant();
  }
  const toLo = instant.epochMilliseconds - lo.toInstant().epochMilliseconds;
  const toHi = hi.toInstant().epochMilliseconds - instant.epochMilliseconds;
  return (toHi < toLo ? hi : lo).toInstant();
}

/**
 * Whether the instant sits within `windowHours` of a DST/offset transition.
 *
 * @param instant - The moment.
 * @param tz - IANA timezone.
 * @param windowHours - Half-window in hours to inspect around the instant.
 * @returns True if a UTC-offset change occurs inside the window.
 * @example isInDstTransition(i, "America/Los_Angeles", 24)
 */
export function isInDstTransition(
  instant: Temporal.Instant,
  tz: string,
  windowHours: number,
): boolean {
  const zdt = instant.toZonedDateTimeISO(tz);
  const prev = zdt.getTimeZoneTransition("previous");
  const next = zdt.getTimeZoneTransition("next");
  const winMs = windowHours * 3_600_000;
  const within = (t: Temporal.ZonedDateTime | null): boolean =>
    t !== null &&
    Math.abs(t.toInstant().epochMilliseconds - instant.epochMilliseconds) <=
      winMs;
  return within(prev) || within(next);
}

// ── Business days ─────────────────────────────────────────────────────────────

function isBusinessDay(
  date: Temporal.PlainDate,
  cal: HolidayCalendarId,
): boolean {
  return date.dayOfWeek <= 5 && !isHoliday(date, cal);
}

/**
 * Count business days between two instants (exclusive of the start date,
 * inclusive of the end date). Sign follows direction.
 *
 * @param from - Start moment.
 * @param to - End moment.
 * @param cal - Holiday calendar.
 * @param tz - Zone the civil dates are evaluated in.
 * @returns Signed business-day count.
 * @example businessDaysBetween(a, b, "us", "UTC")
 */
export function businessDaysBetween(
  from: Temporal.Instant,
  to: Temporal.Instant,
  cal: HolidayCalendarId,
  tz: string,
): number {
  const a = from.toZonedDateTimeISO(tz).toPlainDate();
  const b = to.toZonedDateTimeISO(tz).toPlainDate();
  const cmp = Temporal.PlainDate.compare(a, b);
  if (cmp === 0) return 0;
  const forward = cmp < 0;
  const lo = forward ? a : b;
  const hi = forward ? b : a;
  let cursor = lo.add({ days: 1 });
  let count = 0;
  while (Temporal.PlainDate.compare(cursor, hi) <= 0) {
    if (isBusinessDay(cursor, cal)) count++;
    cursor = cursor.add({ days: 1 });
  }
  return forward ? count : -count;
}

/**
 * Add (or subtract, if negative) N business days to an instant.
 *
 * @param start - Start moment.
 * @param n - Number of business days (negative steps backward).
 * @param cal - Holiday calendar.
 * @param tz - Zone the civil dates are evaluated in.
 * @returns Instant at start-of-day of the resulting business date.
 * @example addBusinessDays(i, 5, "us", "UTC")
 */
export function addBusinessDays(
  start: Temporal.Instant,
  n: number,
  cal: HolidayCalendarId,
  tz: string,
): Temporal.Instant {
  const step = n >= 0 ? 1 : -1;
  let remaining = Math.abs(n);
  let date = start.toZonedDateTimeISO(tz).toPlainDate();
  while (remaining > 0) {
    date = date.add({ days: step });
    if (isBusinessDay(date, cal)) remaining--;
  }
  return Temporal.ZonedDateTime.from({
    year: date.year,
    month: date.month,
    day: date.day,
    timeZone: tz,
  })
    .startOfDay()
    .toInstant();
}

// ── Custom format ─────────────────────────────────────────────────────────────

/**
 * Format an instant with a token string. Supported tokens: YYYY MM DD HH
 * mm ss SSS Z dddd MMMM.
 *
 * @param instant - The moment.
 * @param formatString - Token template.
 * @param tz - IANA timezone to render in.
 * @returns The formatted string.
 * @example parseCustomFormat(i, "YYYY-MM-DD", "UTC") // "2023-11-16"
 */
export function parseCustomFormat(
  instant: Temporal.Instant,
  formatString: string,
  tz: string,
): string {
  const z = instant.toZonedDateTimeISO(tz);
  const map: Record<string, string> = {
    YYYY: String(z.year).padStart(4, "0"),
    MMMM: MONTHS[z.month - 1],
    MM: pad(z.month),
    DD: pad(z.day),
    dddd: WEEKDAYS[z.dayOfWeek - 1],
    HH: pad(z.hour),
    mm: pad(z.minute),
    ss: pad(z.second),
    SSS: String(z.millisecond).padStart(3, "0"),
    Z: z.offset,
  };
  return formatString.replace(
    /YYYY|MMMM|MM|DD|dddd|HH|mm|ss|SSS|Z/g,
    (tok) => map[tok] ?? tok,
  );
}

// ── Timezone catalog ──────────────────────────────────────────────────────────

const COMMON_TZ: string[] = [
  "UTC",
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Sao_Paulo", "America/Mexico_City",
  "America/Toronto", "America/Argentina/Buenos_Aires", "America/Bogota",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "Europe/Rome", "Europe/Amsterdam", "Europe/Moscow", "Europe/Istanbul",
  "Europe/Athens", "Europe/Zurich", "Europe/Dublin", "Europe/Lisbon",
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Jakarta", "Asia/Shanghai", "Asia/Hong_Kong",
  "Asia/Singapore", "Asia/Tokyo", "Asia/Seoul", "Asia/Tehran",
  "Asia/Jerusalem", "Asia/Riyadh", "Asia/Manila",
  "Australia/Sydney", "Australia/Melbourne", "Australia/Perth",
  "Pacific/Auckland", "Pacific/Honolulu", "Pacific/Fiji",
];

function tzEntry(iana: string): { iana: string; label: string; offset: string } {
  let offset = "";
  try {
    offset = Temporal.Now.instant().toZonedDateTimeISO(iana).offset;
  } catch {
    offset = "";
  }
  const label = iana === "UTC" ? "UTC" : iana.split("/").slice(1).join(" / ").replace(/_/g, " ");
  return { iana, label: label || iana, offset };
}

/**
 * The curated list of frequently-used IANA timezones.
 *
 * @returns Entries with id, display label and current offset.
 * @example getCommonTimezones()[0].iana // "UTC"
 */
export function getCommonTimezones(): Array<{
  iana: string;
  label: string;
  offset: string;
}> {
  return COMMON_TZ.map(tzEntry);
}

/**
 * Fuzzy-filter the common timezone list.
 *
 * @param query - Free-text query (matched against id and label).
 * @returns Matching timezone entries.
 * @example searchTimezones("tokyo")[0].iana // "Asia/Tokyo"
 */
export function searchTimezones(query: string): Array<{
  iana: string;
  label: string;
  offset: string;
}> {
  const q = query.trim().toLowerCase();
  if (!q) return getCommonTimezones();
  return getCommonTimezones().filter(
    (t) =>
      t.iana.toLowerCase().includes(q) || t.label.toLowerCase().includes(q),
  );
}
