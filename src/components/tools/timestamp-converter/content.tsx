import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  usesNote: "Read the numbers your logs are full of.",
  intro: "Convert Unix timestamps to human-readable dates and back, across timezones, with awareness of seconds vs milliseconds vs microseconds. A live headline says how long ago (or until) the moment is, next to Unix seconds and milliseconds, ISO 8601, RFC 2822, your local time and five world clocks. From the ⋯ menu you get time-zone comparison, date arithmetic, batch conversion and ready-to-paste code snippets for JavaScript, TypeScript, Python, Go, Rust, Java, PHP, Ruby, SQL and shell.",
  useCases: [
        {
          title: "Debugging timestamps in logs",
          description:
            "Paste a numeric timestamp from a log line to see what date it represents. The converter auto-detects seconds vs milliseconds based on magnitude — 1700000000 is seconds, 1700000000000 is milliseconds.",
        },
        {
          title: "Generating timestamps for test fixtures",
          description:
            "Type a specific date in the input and copy the epoch value to use as a fixed `Date.now()` mock in tests. Turn on Code snippets in the ⋯ menu for the same value in ten languages.",
        },
        {
          title: "Coordinating across timezones",
          description:
            "Type a date and see it in UTC, New York, London, Dhaka and Tokyo at once — or pick your own zones with Compare time zones in the ⋯ menu. Useful when scheduling cross-team events or correlating logs from regional infrastructure.",
        },
        {
          title: "Computing relative times",
          description:
            "The live diff against 'now' shows how long ago (or until) the timestamp is — useful for inspecting JWT expiries, cache TTLs, or scheduled job times.",
        },
      ],
  faqs: [
        {
          question: "Seconds, milliseconds, or microseconds?",
          answer:
            "Unix timestamps are conventionally seconds (10 digits today), but JavaScript's `Date.now()` returns milliseconds (13 digits), and some systems use microseconds (16 digits). The converter auto-detects based on magnitude and shows the unit it inferred in the pill next to the input. Click the pill to reinterpret the number if the guess is wrong.",
        },
        {
          question: "Why are my timestamps off by exactly 1 hour?",
          answer:
            "Almost always a DST issue. The converter shows the offset explicitly — `+01:00` vs `+02:00` for the same wall-clock time in Europe across the DST boundary — and the status bar warns when a DST change is within 24 hours of the moment. Pin the timezone explicitly when working near transitions.",
        },
        {
          question: "What's the difference between ISO 8601 and RFC 2822?",
          answer:
            "ISO 8601 (`2024-01-15T09:00:00Z`) is machine-friendly and used by JSON Schema's `date-time` format. RFC 2822 (`Mon, 15 Jan 2024 09:00:00 GMT`) is human-friendly and used in email headers and HTTP `Date` headers.",
        },
        {
          question: "How does the timezone search work?",
          answer:
            "Open Primary & secondary zones or Compare time zones from the ⋯ menu, then type a city, region, or IANA zone name (`Europe/London`, `America/New_York`, `Asia/Tokyo`). The converter handles all DST rules and historical zone changes via the IANA database your browser ships.",
        },
        {
          question: "Can I share a specific timestamp?",
          answer:
            "Yes — press ⌘L (or choose Copy permalink in the ⋯ menu). The link encodes the timestamp, your selected zones and the mode. Useful for ticket comments or Slack threads.",
        },
        {
          question: "What about timestamps before 1970?",
          answer:
            "Negative epoch values represent dates before the Unix epoch, and the converter handles them correctly. Some languages and databases have trouble with negative timestamps, so double-check the generated snippet against your runtime.",
        },
      ],
  relatedSlugs: ["timezone-converter", "date-difference", "cron-parser", "iso-duration"],
} as const;

export function TimestampConverterContent() {
  return <ToolContent {...seoData} />;
}
