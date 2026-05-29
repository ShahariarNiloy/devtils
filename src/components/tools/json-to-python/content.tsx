import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro: "Generate Python type definitions from any JSON sample. Three model styles to match your codebase: stdlib `@dataclass` (zero dependencies), `TypedDict` (lightweight, dict-shaped), or Pydantic v2 `BaseModel` (runtime validation + serialization). String formats — `date-time`, `date`, `uuid` — are mapped to their stdlib types so you don't have to re-parse.",
  useCases: [
        {
          title: "FastAPI request/response models",
          description:
            "Pick the Pydantic v2 flavour and use the output directly as FastAPI route signatures. The detected formats (`datetime`, `UUID`) become Pydantic's built-in validators automatically.",
        },
        {
          title: "Stricter `dict` typing in existing code",
          description:
            "Use TypedDict to retrofit type hints onto code that already passes dictionaries around. Zero runtime cost, full mypy coverage.",
        },
        {
          title: "Data class for API SDKs",
          description:
            "Pick `@dataclass` for a lightweight client-side representation — easy to construct, serialize back with `asdict()`, no extra deps.",
        },
        {
          title: "Configuration parsing",
          description:
            "Generate from your `config.json`, then use Pydantic's `model_validate_json()` to get validated config objects with clear error messages.",
        },
      ],
  faqs: [
        {
          question: "What's the difference between dataclass, TypedDict, and Pydantic?",
          answer:
            "Dataclass: stdlib classes with `__init__` and field defaults — no validation. TypedDict: structural type hints for dicts — no runtime behaviour. Pydantic: classes with runtime validation, serialization, and JSON schema generation — needs the pydantic package installed.",
        },
        {
          question: "Should I enable `slots=True`?",
          answer:
            "For dataclasses with many instances, `slots=True` cuts memory usage by ~20% and slightly speeds up attribute access. Trade-off: you can't add arbitrary attributes after construction. Reasonable default for data-shaped classes.",
        },
        {
          question: "Why are optional fields grouped at the bottom of dataclasses?",
          answer:
            "Python dataclasses require fields with defaults to come after fields without — the emitter respects that. Optional and nullable-required fields all default to `None`.",
        },
        {
          question: "How does Pydantic v2 differ from v1?",
          answer:
            "v2 is significantly faster (built on Rust) and uses `model_validate` / `model_dump` instead of v1's `parse_obj` / `dict()`. The emitted models work on v2; older v1 codebases need minor method-name updates.",
        },
        {
          question: "Why do I see `from __future__ import annotations`?",
          answer:
            "This delays evaluation of type hints to runtime — required for forward references between dataclasses where one type references another defined later in the file. It's been the recommended default since Python 3.10.",
        },
        {
          question: "Can I generate `attrs` classes instead?",
          answer:
            "Not yet — currently dataclass, TypedDict, and Pydantic. attrs is structurally similar to dataclass; you can usually rename `@dataclass` to `@attrs.define` and adjust defaults.",
        },
      ],
  relatedSlugs: ["json-to-typescript", "json-to-go", "json-to-rust", "json-schema", "json-to-zod"],
} as const;

export function JsonToPythonContent() {
  return <ToolContent {...seoData} />;
}
