import { ToolContent } from "@/components/json-converter";

export function JsonToRustContent() {
  return (
    <ToolContent
      intro={'Generate Rust struct definitions with serde derives from any JSON sample. The converter handles the idioms that make serde happy: snake_case fields with `#[serde(rename = "...")]` when the source key differs, `Option<T>` for optional and nullable fields with `skip_serializing_if = "Option::is_none"` so JSON round-trips cleanly, and `Vec<T>` / `serde_json::Value` for arrays and unknown shapes.'}
      useCases={[
        {
          title: "Modelling external API responses",
          description:
            "Drop the JSON payload, copy the structs into a `types.rs` file, and call `serde_json::from_str` directly. Optional fields with `skip_serializing_if` keep the serialized output clean.",
        },
        {
          title: "Configuration parsing",
          description:
            "Pair with `serde_json` / `serde_yaml` / `toml` to parse config files into strongly-typed structs with detailed deserialization errors instead of `Value` access by string keys.",
        },
        {
          title: "Webhook handlers in Axum / Actix",
          description:
            "Generate from a sample webhook payload to get a typed `Json<T>` extractor in your handlers — no manual deserialization, automatic 400 responses on malformed input.",
        },
        {
          title: "Bindings for C APIs that return JSON",
          description:
            "When wrapping a C library that emits JSON strings, the generated structs give you a clean Rust-side representation without manual parsing.",
        },
      ]}
      faqs={[
        {
          question: "Should I derive `Default`?",
          answer:
            "Useful if you want `T::default()` construction or if you nest the struct inside another that derives `Default`. Note: requires every field type to also implement `Default`, which fails for some serde types.",
        },
        {
          question: "What does `deny_unknown_fields` do?",
          answer:
            "When enabled, deserialization fails if the JSON contains keys not declared in the struct. Useful for catching API drift early; harmful if the API adds new fields you don't care about.",
        },
        {
          question: "Why are date-time strings `String` instead of `chrono::DateTime`?",
          answer:
            "Stdlib has no datetime type, so the safe default is `String` — no external crate required. To get `chrono::DateTime<Utc>`, swap the field type by hand and add `chrono = { version = \"0.4\", features = [\"serde\"] }` to your `Cargo.toml`.",
        },
        {
          question: "What's `serde_json::Value` for?",
          answer:
            "Used when the JSON value has too many shapes to model (mixed-type arrays, unknown nested data). It's a catch-all that holds any JSON value at runtime — type-safe but opaque until you destructure.",
        },
        {
          question: "Why are some field names prefixed with `r#`?",
          answer:
            "Raw identifier syntax — used when the JSON key is a Rust keyword (`type`, `match`, etc.). The `#[serde(rename)]` attribute keeps the JSON serialization matching the original.",
        },
        {
          question: "Can I add `Eq` / `Hash` to the derive list?",
          answer:
            "Not via the toggles yet — Default and PartialEq are exposed. Eq requires every field type to implement Eq, which fails for `f64`. Add by hand to specific structs where appropriate.",
        },
      ]}
      relatedSlugs={["json-to-typescript", "json-to-go", "json-to-python", "json-schema"]}
    />
  );
}
