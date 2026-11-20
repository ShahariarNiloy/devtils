/**
 * Static configuration for the Timestamp converter. Pure values — no React,
 * no module-level clock reads (the default-timezone resolution is a function
 * so this module stays deterministic at import time).
 */

import { Temporal } from "@js-temporal/polyfill";
import type { DetectedFormat } from "./timestamp-converter.types";

/** Fallback primary timezone when the runtime zone can't be resolved. */
export const DEFAULT_PRIMARY_TZ = "UTC";

/**
 * Resolve the user's runtime timezone, falling back to UTC.
 *
 * @returns An IANA timezone id.
 * @example resolveDefaultPrimaryTz() // "Asia/Dhaka"
 */
export function resolveDefaultPrimaryTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_PRIMARY_TZ;
  } catch {
    return DEFAULT_PRIMARY_TZ;
  }
}

export const DEFAULT_SECONDARY_TZ = "UTC";
export const DEFAULT_CUSTOM_FORMAT = "YYYY-MM-DD HH:mm:ss";
export const MAX_HISTORY_ITEMS = 50;
export const MAX_BATCH_ROWS = 100_000;
export const DST_WARN_WINDOW_HOURS = 24;

/** The "Around the world" list in the v2 workspace (city, IANA zone). */
export const WORLD_ZONES: readonly (readonly [string, string])[] = [
  ["UTC", "UTC"],
  ["New York", "America/New_York"],
  ["London", "Europe/London"],
  ["Dhaka", "Asia/Dhaka"],
  ["Tokyo", "Asia/Tokyo"],
];

export interface SupportedLanguage {
  id: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "sql", label: "SQL (PostgreSQL)" },
  { id: "shell", label: "Shell (GNU date)" },
];

export interface EpochLandmark {
  label: string;
  instant: Temporal.Instant;
  description: string;
}

/** Notable instants on the Unix timeline. */
export const EPOCH_LANDMARKS: EpochLandmark[] = [
  {
    label: "Unix epoch",
    instant: Temporal.Instant.from("1970-01-01T00:00:00Z"),
    description: "Timestamp 0 — where Unix time begins.",
  },
  {
    label: "Y2K",
    instant: Temporal.Instant.from("2000-01-01T00:00:00Z"),
    description: "The year-2000 rollover.",
  },
  {
    label: "1 billion seconds",
    instant: Temporal.Instant.from("2001-09-09T01:46:40Z"),
    description: "Unix time crossed 1,000,000,000.",
  },
  {
    label: "32-bit overflow (Y2038)",
    instant: Temporal.Instant.from("2038-01-19T03:14:07Z"),
    description: "Signed 32-bit Unix time wraps — the Year-2038 problem.",
  },
  {
    label: "JS max safe date",
    instant: Temporal.Instant.fromEpochMilliseconds(8_640_000_000_000_000),
    description: "Largest date a JS Date can represent (8.64e15 ms).",
  },
];

/** Human label for each detected input format (the kind pill). */
export const DETECTED_FORMAT_LABEL: Record<DetectedFormat, string> = {
  "unix-s": "Unix seconds",
  "unix-ms": "Unix milliseconds",
  "unix-us": "Unix microseconds",
  "unix-ns": "Unix nanoseconds",
  "iso-8601": "ISO 8601",
  "rfc-2822": "RFC 2822",
  "rfc-3339": "RFC 3339",
  "js-date-string": "Date string",
  "log-format": "Log timestamp",
  "natural-language": "Natural language",
  "excel-serial": "Excel serial",
  unknown: "Unrecognised",
};

/** Reinterpretations offered for an all-digits input. */
export const FORMAT_OVERRIDES: readonly DetectedFormat[] = [
  "unix-s",
  "unix-ms",
  "unix-us",
  "unix-ns",
  "excel-serial",
];
