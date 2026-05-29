import { ToolContent } from "@/components/shared/tool-content";

/**
 * SEO + discoverability block for the JSON → TypeScript tool. Content is
 * hand-written for the tool's specific behaviour — what its emitter does
 * (named subtypes + dedup, format JSDoc, optional/nullable distinction) and
 * the edge cases visitors actually search for ("why is my array typed
 * `unknown`?", "how do I rename `Root`?").
 */
export const seoData = {
  intro: "Paste any JSON sample and get clean, ready-to-import TypeScript types. The converter walks the document once, names every distinct shape as a top-level interface (no anonymous nested pyramids), and infers optional fields by intersecting keys across array items. Format hints from the JSON Schema layer — `date-time`, `uuid`, `email` — surface as `@format` JSDoc comments so downstream tooling can pick them up.",
  useCases: [
        {
          title: "Modelling an API response",
          description:
            "Drop a sample payload from a fetch call, copy the generated `interface`, paste into your codebase. The intersect-required-keys heuristic handles partial / optional fields correctly across mixed array items.",
        },
        {
          title: "Replacing `any` in a legacy codebase",
          description:
            "Run a representative production payload through the converter and use the resulting types as the seed for migrating an existing `any`-typed integration.",
        },
        {
          title: "Locking down a config schema",
          description:
            "Convert your `config.json` to a TypeScript type, then `as const` your runtime config and let `satisfies` catch drift between schema and values.",
        },
        {
          title: "Generating types for SDK clients",
          description:
            "Use the `type` declaration style + `readonly` toggle to produce immutable-by-default types suitable for public SDK surfaces.",
        },
      ],
  faqs: [
        {
          question: "Why is my array typed `unknown[]`?",
          answer:
            "An empty array gives the inferrer nothing to work with, so it falls back to `unknown[]`. Add a representative element to the sample and re-convert.",
        },
        {
          question: "Can I rename the root type?",
          answer:
            "Yes — the Root field at the top of the options bar accepts any valid TypeScript identifier. It also propagates into the download filename so saved files match.",
        },
        {
          question: "Why is a field marked optional when my sample always has it?",
          answer:
            "Optionality is inferred as the intersection of keys across all observed sibling objects (for arrays) or as 'present' for single objects. If you're seeing unexpected optionality, you likely have inconsistent keys across array items in your sample.",
        },
        {
          question: "Does it support discriminated unions?",
          answer:
            "Not yet — currently sibling object shapes are merged into one union of optionals rather than split on a discriminator key. The codegen IR already detects literal string fields, so this is a planned follow-up.",
        },
        {
          question: "What's the difference between `interface` and `type`?",
          answer:
            "Functionally equivalent for object shapes. `interface` supports declaration merging (multiple definitions augment each other) and tends to read better in error messages; `type` works for unions / mapped types. Pick by codebase convention.",
        },
        {
          question: "Why are children declared before their parents?",
          answer:
            "Default is children-first so each type is declared above its first reference — easier to read top-to-bottom. Flip the toggle if you prefer Root-first (the convention quicktype uses).",
        },
        {
          question: "Does the URL save my options?",
          answer:
            "Yes. Any non-default options are encoded as query parameters, so you can bookmark or share a link that opens the tool with the same configuration.",
        },
      ],
  relatedSlugs: ["json-to-zod", "json-schema", "json-to-go", "json-to-python", "json-to-rust"],
} as const;

export function JsonToTypeScriptContent() {
  return <ToolContent {...seoData} />;
}
