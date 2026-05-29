import { ToolContent } from "@/components/shared/tool-content";

export function TimestampConverterContent() {
  return (
    <ToolContent
      intro="Convert Unix timestamps to human-readable dates and back, across timezones, with awareness of seconds vs milliseconds vs microseconds. Live updating clock shows the current epoch alongside ISO 8601, RFC 2822, and per-timezone formats. Generates ready-to-paste code snippets for JavaScript, Python, Go, Rust, SQL, and shell — so you can ship the converted value into your codebase directly."
      useCases={[
        {
          title: "Debugging timestamps in logs",
          description:
            "Paste a numeric timestamp from a log line to see what date it represents. The converter auto-detects seconds vs milliseconds based on magnitude — 1700000000 is seconds, 1700000000000 is milliseconds.",
        },
        {
          title: "Generating timestamps for test fixtures",
          description:
            "Pick a specific date in the input, get the epoch value to use as a fixed `Date.now()` mock in tests. Snippets for every common language.",
        },
        {
          title: "Coordinating across timezones",
          description:
            "Type a date and see it rendered in multiple zones simultaneously. Useful when scheduling cross-team events or correlating logs from regional infrastructure.",
        },
        {
          title: "Computing relative times",
          description:
            "The live diff against 'now' shows how long ago (or until) the timestamp is — useful for inspecting JWT expiries, cache TTLs, or scheduled job times.",
        },
      ]}
      faqs={[
        {
          question: "Seconds, milliseconds, or microseconds?",
          answer:
            "Unix timestamps are conventionally seconds (10 digits today), but JavaScript's `Date.now()` returns milliseconds (13 digits), and some systems use microseconds (16 digits). The converter auto-detects based on magnitude and shows you which unit it inferred.",
        },
        {
          question: "Why are my timestamps off by exactly 1 hour?",
          answer:
            "Almost always a DST issue. The converter shows the offset explicitly — `+01:00` vs `+02:00` for the same wall-clock time in Europe across the DST boundary. Pin the timezone explicitly when working near transitions.",
        },
        {
          question: "What's the difference between ISO 8601 and RFC 2822?",
          answer:
            "ISO 8601 (`2024-01-15T09:00:00Z`) is machine-friendly and used by JSON Schema's `date-time` format. RFC 2822 (`Mon, 15 Jan 2024 09:00:00 GMT`) is human-friendly and used in email headers and HTTP `Date` headers.",
        },
        {
          question: "How does the timezone search work?",
          answer:
            "Type a city, region, or IANA zone name (`Europe/London`, `America/New_York`, `Asia/Tokyo`). The converter handles all DST rules and historical zone changes via the IANA database your browser ships.",
        },
        {
          question: "Can I share a specific timestamp?",
          answer:
            "Yes — copy the URL after entering a value, and the link encodes the timestamp + selected timezone. Useful for ticket comments or Slack threads.",
        },
        {
          question: "What about timestamps before 1970?",
          answer:
            "Negative epoch values represent dates before the Unix epoch. The converter handles them correctly. Some languages and databases have issues with negative timestamps — the code snippets warn when this applies.",
        },
      ]}
      relatedSlugs={["timezone-converter", "date-difference", "cron-parser", "iso-duration"]}
    />
  );
}
