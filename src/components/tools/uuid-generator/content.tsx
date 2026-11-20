import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Generate UUID v4, UUID v7 and ULID identifiers in bulk, straight from your browser's cryptographically secure random generator. Each batch shows the anatomy of the first ID — which bits are the timestamp, the version, the variant and the randomness — and you can paste any UUID or ULID to see what it is and when it was created. Nothing is sent to a server.",
  usesNote: "IDs that are actually unique.",
  useCases: [
    {
      title: "Database keys",
      description: "Use v7 or ULID for keys that sort by creation time, so new rows land at the end of the index instead of scattering across it.",
    },
    {
      title: "Test fixtures",
      description: "Grab up to 20 IDs at once for seed data, copy them as plain lines or a JSON array, or download 1,000 as a text file.",
    },
    {
      title: "Inspect an ID",
      description: "See when a v7 or ULID was created by decoding its 48-bit millisecond timestamp, or check which version a UUID from your logs is.",
    },
  ],
  faqs: [
    {
      question: "v4, v7 or ULID?",
      answer:
        "v4 is fully random. v7 and ULID start with a millisecond timestamp, so they sort by time and index well in databases. Pick v7 when your stack expects the UUID format, ULID when you want a shorter, case-insensitive string.",
    },
    {
      question: "Are they really random?",
      answer:
        "Yes. The random bits come from crypto.getRandomValues, the browser's cryptographically secure generator — not Math.random. IDs are generated on your device and never leave the page.",
    },
    {
      question: "Can two IDs collide?",
      answer:
        "In practice, no. v4 has 122 random bits, v7 has 74 random bits per millisecond and ULID has 80. You would need to generate billions of IDs in the same millisecond before a collision became remotely likely.",
    },
    {
      question: "Why is a batch of v7 IDs or ULIDs in order?",
      answer:
        "Every ID in a batch carries the real current timestamp, so IDs made in the same millisecond share their time prefix. The batch is sorted so it reads in the same order a database index would keep it.",
    },
    {
      question: "What do Uppercase and No hyphens change?",
      answer:
        "Only the formatting of UUIDs. The value is the same — UUIDs are case-insensitive and the hyphens are optional. ULIDs are always uppercase and never hyphenated, so those switches don't apply to them.",
    },
  ],
  relatedSlugs: ["password-generator", "timestamp-converter", "jwt-decoder", "json-formatter"],
} as const;

export function UuidGeneratorContent() {
  return <ToolContent {...seoData} />;
}
