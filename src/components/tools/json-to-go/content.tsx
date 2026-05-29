import { ToolContent } from "@/components/json-converter";

export function JsonToGoContent() {
  return (
    <ToolContent
      intro={'Generate Go struct definitions from any JSON sample. The converter handles the small but important Go idioms: PascalCase field names with `json:"..."` tags, pointer-with-omitempty for optional fields, `*T` for nullable values, and consistent type naming across the whole document tree. Pick your package name, tag style (original / snake_case / camelCase), and whether optional fields get `,omitempty`.'}
      useCases={[
        {
          title: "Modelling REST API responses",
          description:
            "Drop the JSON payload, copy the structs into a `types.go` file, and use `json.Unmarshal` directly. Optional fields with `,omitempty` round-trip cleanly back to JSON.",
        },
        {
          title: "Defining gRPC / Protobuf adjacents",
          description:
            "When you need a Go representation that mirrors a JSON shape used elsewhere (config files, webhook payloads, etc.) without owning the canonical schema.",
        },
        {
          title: "Webhook handlers",
          description:
            "Generate from a sample webhook payload — Stripe, GitHub, Slack — to get a typed handler instead of `map[string]interface{}` access.",
        },
        {
          title: "Config file parsing",
          description:
            "Strongly type your YAML/JSON config: generate the structs, then `yaml.Unmarshal` or `json.Unmarshal` into them with confidence about which fields are required.",
        },
      ]}
      faqs={[
        {
          question: "Why are some fields `*string` instead of `string`?",
          answer:
            "Pointers are how Go distinguishes 'absent' from 'zero value' in JSON. Optional fields use `*T` so that an absent key stays as nil rather than getting the type's zero value, which would round-trip incorrectly.",
        },
        {
          question: "What does `,omitempty` do?",
          answer:
            "When marshalling back to JSON, fields tagged with `,omitempty` are excluded if their value is the zero value (or nil pointer). Turn it off if you always want every field present in the output.",
        },
        {
          question: "Should I use snake_case or camelCase tags?",
          answer:
            "Match what your API actually returns. Many REST APIs use snake_case; GraphQL and many newer APIs use camelCase. 'Original' preserves whatever your sample uses, which is usually the safest bet.",
        },
        {
          question: "Why is my nullable field `interface{}` instead of `*string`?",
          answer:
            "If a field is observed as both `string` and `null` across the sample, it gets the nullable string treatment (`*string`). If it's observed as multiple non-null types, the inference falls back to `interface{}` since Go has no union types.",
        },
        {
          question: "Does it support `encoding/json` v2?",
          answer:
            "The output works with both v1 and v2. v2 adds support for `omitzero` (more precise than `omitempty`) — you can search/replace if you prefer the stricter semantic.",
        },
        {
          question: "Can I add custom tags (e.g., `bson`, `gorm`)?",
          answer:
            "Not currently. The output is a starting point — append additional tags by hand to specific fields as needed. A future option may surface this directly.",
        },
      ]}
      relatedSlugs={["json-to-typescript", "json-to-rust", "json-to-python", "json-schema"]}
    />
  );
}
