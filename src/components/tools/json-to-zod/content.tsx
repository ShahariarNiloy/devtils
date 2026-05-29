import { ToolContent } from "@/components/json-converter";

export const seoData = {
  intro: "Generate a Zod schema from any JSON sample, complete with `z.infer` type aliases so you get a runtime validator and the matching TypeScript type from one declaration. Built on the same schema IR as the JSON → TypeScript tool, so nested optionals, structural dedup, and format-aware string detection all carry over — UUID fields emit `.uuid()`, ISO timestamps emit `.datetime({ offset: true })`, emails emit `.email()`.",
  useCases: [
        {
          title: "Validating API responses at runtime",
          description:
            "Drop in a representative payload, paste the schema into your fetcher, and wrap each response in `schema.parse()` for end-to-end type safety with runtime guarantees.",
        },
        {
          title: "tRPC / Hono / Next.js route handlers",
          description:
            "Use the generated schema as the `input` / `output` for tRPC procedures or Hono validators. The `z.infer` aliases give you the matching TypeScript type for handlers and clients.",
        },
        {
          title: "Form data validation",
          description:
            "Pair with `react-hook-form` + `@hookform/resolvers/zod` to get form validation that matches your backend schema exactly.",
        },
        {
          title: "Configuration file parsing",
          description:
            "Load `config.json` with `schema.parse(JSON.parse(file))` to catch malformed config at startup with a precise error path instead of failing at first use.",
        },
      ],
  faqs: [
        {
          question: "What Zod version is the output compatible with?",
          answer:
            "Zod v3+. The emitter avoids v4-only constructs and stays on the stable subset that hasn't moved in the last two majors.",
        },
        {
          question: "Should I turn on `.strict()`?",
          answer:
            "Turn it on if you want extra (unknown) keys in the input to fail validation. Useful for closed-world configs and API contracts; leave off for forward-compatible APIs where new fields are expected.",
        },
        {
          question: "Why is my date field a `z.string().datetime()` instead of `z.date()`?",
          answer:
            "JSON has no date type — values come through as strings. `z.string().datetime()` validates the ISO 8601 format. If you want a `Date` instance after parsing, chain `.transform((s) => new Date(s))`.",
        },
        {
          question: "Can I disable the format refinements?",
          answer:
            "Yes — flip the 'Format refinements' switch off. The output becomes plain `z.string()` for every string field, useful when you don't want stricter validation than your data actually provides.",
        },
        {
          question: "Why do I see both `UserSchema` and `userSchema`?",
          answer:
            "PascalCase schema constants follow the type names; the lower-case alias matches your chosen schema name. They reference the same value — keep whichever fits your codebase convention.",
        },
        {
          question: "Does the URL save my options?",
          answer:
            "Yes — root name, strict mode, and refinements are all encoded as query parameters for shareable links.",
        },
      ],
  relatedSlugs: ["json-to-typescript", "json-schema", "json-to-go", "json-to-python"],
} as const;

export function JsonToZodContent() {
  return <ToolContent {...seoData} />;
}
