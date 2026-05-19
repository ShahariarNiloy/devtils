/**
 * Curated public-holiday calendars for business-day math. Pure, deterministic.
 *
 * US Federal is computed exactly (fixed dates + nth-weekday rules).
 * UK / EU / India / Japan are a curated set of the major nationwide public
 * holidays (fixed dates, plus Easter-derived days for UK/EU) — sufficient
 * for developer tooling, not a legal calendar.
 */

import { Temporal } from "@js-temporal/polyfill";

export type HolidayCalendarId = "none" | "us" | "uk" | "eu" | "in" | "jp";

export const HOLIDAY_CALENDARS: { id: HolidayCalendarId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "us", label: "US Federal" },
  { id: "uk", label: "United Kingdom" },
  { id: "eu", label: "EU (common)" },
  { id: "in", label: "India" },
  { id: "jp", label: "Japan" },
];

function nthWeekday(
  year: number,
  month: number,
  weekday: number,
  n: number,
): string {
  const first = Temporal.PlainDate.from({ year, month, day: 1 });
  const shift = (weekday - first.dayOfWeek + 7) % 7;
  const day = 1 + shift + (n - 1) * 7;
  return `${pad(month)}-${pad(day)}`;
}

function lastWeekday(year: number, month: number, weekday: number): string {
  const dim = Temporal.PlainDate.from({ year, month, day: 1 }).daysInMonth;
  const last = Temporal.PlainDate.from({ year, month, day: dim });
  const back = (last.dayOfWeek - weekday + 7) % 7;
  return `${pad(month)}-${pad(dim - back)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Easter Sunday (Gregorian, Meeus/Jones/Butcher). */
function easter(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function addDays(mmdd: string, year: number, delta: number): string {
  const [m, d] = mmdd.split("-").map(Number);
  const r = Temporal.PlainDate.from({ year, month: m, day: d }).add({
    days: delta,
  });
  return `${pad(r.month)}-${pad(r.day)}`;
}

/** Set of "MM-DD" holiday keys for a calendar in a given year. */
function holidaysForYear(cal: HolidayCalendarId, year: number): Set<string> {
  const s = new Set<string>();
  if (cal === "none") return s;
  const e = easter(year);
  const easterMd = `${pad(e.month)}-${pad(e.day)}`;

  if (cal === "us") {
    s.add("01-01");
    s.add(nthWeekday(year, 1, 1, 3)); // MLK
    s.add(nthWeekday(year, 2, 1, 3)); // Washington
    s.add(lastWeekday(year, 5, 1)); // Memorial
    s.add("06-19");
    s.add("07-04");
    s.add(nthWeekday(year, 9, 1, 1)); // Labor
    s.add(nthWeekday(year, 10, 1, 2)); // Columbus
    s.add("11-11");
    s.add(nthWeekday(year, 11, 4, 4)); // Thanksgiving
    s.add("12-25");
  } else if (cal === "uk") {
    s.add("01-01");
    s.add(addDays(easterMd, year, -2)); // Good Friday
    s.add(addDays(easterMd, year, 1)); // Easter Monday
    s.add(nthWeekday(year, 5, 1, 1)); // Early May BH
    s.add(lastWeekday(year, 5, 1)); // Spring BH
    s.add(lastWeekday(year, 8, 1)); // Summer BH
    s.add("12-25");
    s.add("12-26");
  } else if (cal === "eu") {
    s.add("01-01");
    s.add(addDays(easterMd, year, -2));
    s.add(addDays(easterMd, year, 1));
    s.add("05-01");
    s.add("12-25");
    s.add("12-26");
  } else if (cal === "in") {
    s.add("01-26"); // Republic Day
    s.add("08-15"); // Independence Day
    s.add("10-02"); // Gandhi Jayanti
    s.add("12-25");
  } else if (cal === "jp") {
    s.add("01-01");
    s.add(nthWeekday(year, 1, 1, 2)); // Coming of Age
    s.add("02-11");
    s.add("02-23");
    s.add("04-29");
    s.add("05-03");
    s.add("05-04");
    s.add("05-05");
    s.add(nthWeekday(year, 7, 1, 3)); // Marine Day
    s.add("08-11");
    s.add(nthWeekday(year, 9, 1, 3)); // Respect for the Aged
    s.add(nthWeekday(year, 10, 1, 2)); // Sports Day
    s.add("11-03");
    s.add("11-23");
  }
  return s;
}

/**
 * Whether a date is a holiday in the given calendar.
 *
 * @param date - The civil date.
 * @param cal - Calendar id.
 * @returns True if the date is a public holiday.
 * @example isHoliday(Temporal.PlainDate.from("2025-12-25"), "us") // true
 */
export function isHoliday(
  date: Temporal.PlainDate,
  cal: HolidayCalendarId,
): boolean {
  if (cal === "none") return false;
  const key = `${pad(date.month)}-${pad(date.day)}`;
  return holidaysForYear(cal, date.year).has(key);
}
