/**
 * Type contracts for the Timestamp converter engine. Pure types only — no
 * runtime, no React. `Temporal` is imported type-only so this module stays
 * side-effect free.
 */

import type { Temporal } from "@js-temporal/polyfill";

export type DetectedFormat =
  | "unix-s"
  | "unix-ms"
  | "unix-us"
  | "unix-ns"
  | "iso-8601"
  | "rfc-2822"
  | "rfc-3339"
  | "js-date-string"
  | "log-format"
  | "natural-language"
  | "excel-serial"
  | "unknown";

export interface ParseResult {
  ok: boolean;
  /** The parsed exact moment. Present only when `ok` is true. */
  instant?: Temporal.Instant;
  detectedFormat: DetectedFormat;
  rawInput: string;
  error?: string;
  /** True when the input plausibly matches more than one format. */
  ambiguous?: boolean;
  ambiguousCandidates?: DetectedFormat[];
}

export interface FormatOutputs {
  unixS: string;
  unixMs: string;
  unixUs: string;
  unixNs: string;
  /** ISO 8601 in the primary timezone (offset form, no [tz] suffix). */
  iso8601Primary: string;
  iso8601Utc: string;
  rfc2822: string;
  rfc3339: string;
  localeString: string;
  customFormat: string;
}

export interface TimezoneView {
  iana: string;
  /** Short zone name, e.g. "BST" / "GMT+6". */
  abbreviation: string;
  /** UTC offset, e.g. "+06:00". */
  offset: string;
  iso8601: string;
  /** Friendly long form, e.g. "Thursday, November 16, 2023 at 11:50:56 AM". */
  human: string;
  /** Time of day, e.g. "8:15:56 AM" — the hero scan target on the card. */
  time: string;
  /** Date, e.g. "Friday, March 26, 2286". */
  date: string;
  dayOfWeek: string;
  dayOfYear: number;
  weekOfYear: number;
  quarter: number;
  /** Human relative phrasing, e.g. "2 hours ago". */
  relativeTime: string;
}

export type ToolMode = "single" | "compare" | "arithmetic" | "batch";

export interface DurationParts {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  totalMs: number;
  /** e.g. "2 days, 4 hours, 12 minutes". */
  humanReadable: string;
}
