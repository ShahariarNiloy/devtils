import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Paste a crontab line and read it back in plain English, field by field, with the next times it will fire in your own time zone. It understands standard five-field cron — lists, ranges, steps, month and weekday names, and the @daily-style macros — and points at the exact field when something is wrong. Everything runs in your browser.",
  usesNote: "Know exactly when a job will fire.",
  useCases: [
    {
      title: "Check a schedule",
      description: "Confirm a crontab line does what you think before it ships — the sentence and the field cards make an off-by-one hour obvious.",
    },
    {
      title: "Write a new one",
      description: "Start from a preset like Weekdays 09:30 or Monthly and adjust a field at a time, watching the description update as you type.",
    },
    {
      title: "Plan around runs",
      description: "See the next five times it will fire (or the next 20 from the ⋯ menu), with how long until each one.",
    },
  ],
  faqs: [
    {
      question: "Which syntax is supported?",
      answer:
        "Standard five-field cron: minute, hour, day of month, month and day of week. Each field takes *, numbers, ranges (1-5), steps (*/15 or 0-30/10), lists (1,15) and, for months and weekdays, names like JAN or MON. Weekday 7 means Sunday, and @hourly, @daily, @weekly, @monthly and @yearly are expanded. Six-field (seconds) and Quartz-only syntax like L or # are not supported.",
    },
    {
      question: "What if day and weekday are both set?",
      answer:
        "Like Unix (Vixie) cron, the job runs when either one matches. 0 0 13 * 5 fires on the 13th of every month and on every Friday — not only on Friday the 13th. If either field starts with *, both must match.",
    },
    {
      question: "Which time zone are next runs in?",
      answer:
        "Your device's time zone, shown next to the list. Servers usually run cron in their own zone (often UTC), so a job may fire at a different local time there. Times that don't exist because of a daylight-saving jump are skipped.",
    },
    {
      question: "Why does my schedule never run?",
      answer:
        "Usually a day that doesn't exist in that month, like 0 0 31 2 * (31 February). The parser looks eight years ahead, which is enough to catch 29 February schedules, and tells you when nothing turns up.",
    },
    {
      question: "Can I share an expression?",
      answer:
        "Yes. The expression is kept in the page URL, so copying the address (or Copy share link in the ⋯ menu) opens the same schedule for someone else.",
    },
  ],
  relatedSlugs: ["timestamp-converter", "regex-tester", "uuid-generator", "json-formatter"],
} as const;

export function CronParserContent() {
  return <ToolContent {...seoData} />;
}
