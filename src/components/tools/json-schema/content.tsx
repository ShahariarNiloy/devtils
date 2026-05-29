import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro: "Infer a JSON Schema from any sample document. Walks the value once, detects primitive types (including the integer / number distinction), recognises string formats (`date-time`, `date`, `uri`, `email`, `uuid`), and computes required fields as the intersection of keys observed across array items. Choose draft 2020-12 (the latest spec) or draft-07 for compatibility with older validators.",
  useCases: [
        {
          title: "Seeding an API contract",
          description:
            "Drop a representative response, edit the inferred schema by hand, and use it as the canonical contract for openapi-generator, ajv, or any other schema-driven tool.",
        },
        {
          title: "Validating incoming webhooks",
          description:
            "Generate a schema from a known-good webhook payload, then validate every incoming request against it. Catches malformed third-party deliveries with precise error paths.",
        },
        {
          title: "Documenting a config file format",
          description:
            "Use the schema as the source of truth for your config. Most IDEs (VS Code, JetBrains) can pick up `$schema` in JSON files and provide autocomplete + inline validation from it.",
        },
        {
          title: "Generating test data",
          description:
            "JSON Schema is consumed by many fuzz / property-based testing tools to generate valid example values. Use the inferred schema as input.",
        },
      ],
  faqs: [
        {
          question: "Which draft should I pick?",
          answer:
            "2020-12 is the current standard, recommended for new projects. draft-07 has the widest tool support (most validators were written against it). They're mostly compatible for inferred schemas.",
        },
        {
          question: "Why isn't every field required?",
          answer:
            "If your input is an array of objects with varying keys, only the keys present in *every* item are marked required. For single objects, every observed key is required. This avoids false-required claims when sibling items disagree.",
        },
        {
          question: "What's the `format` field for?",
          answer:
            "JSON Schema's format hints — `date-time`, `email`, `uri`, `uuid` — that validators use for stricter checks. The tool detects them from string content (ISO 8601, URL.parse, etc.).",
        },
        {
          question: "How is `integer` distinguished from `number`?",
          answer:
            "If every observed value for a field is a whole number, the type is `integer`; if any are fractional, it's `number`. Consumers like ajv enforce this — `12.5` rejected if the type is `integer`.",
        },
        {
          question: "Will it detect enums?",
          answer:
            "Not currently. Enum inference requires frequency analysis (how many distinct string values appear across siblings); this is on the roadmap.",
        },
        {
          question: "Can I use the schema with ajv / openapi-generator / quicktype?",
          answer:
            "Yes. The output is plain JSON Schema with `$schema` set to the draft URL, so any draft-aware tool will accept it. Pair with `json-to-typescript` here for matching types.",
        },
      ],
  relatedSlugs: ["json-to-typescript", "json-to-zod", "json-to-go", "json-to-python", "json-to-rust"],
} as const;

export function JsonSchemaContent() {
  return <ToolContent {...seoData} />;
}
