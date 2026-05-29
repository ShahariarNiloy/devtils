import { ToolContent } from "@/components/shared/tool-content";

export function CaseConverterContent() {
  return (
    <ToolContent
      intro="Convert text between every common case format: camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE, Title Case, sentence case, and more. Handles multi-word identifiers, acronyms, mixed-case inputs, and preserves numbers correctly. Useful for renaming variables, normalising config keys, or generating CSS classnames from copy."
      useCases={[
        {
          title: "Renaming variables across languages",
          description:
            "Convert a JavaScript identifier (camelCase) to Python style (snake_case) when porting code. Or vice versa when integrating with a Python API from JS.",
        },
        {
          title: "Generating CSS classnames from design copy",
          description:
            "Designer hands you a list of section names — convert each to kebab-case for use as classnames or component keys.",
        },
        {
          title: "Normalising database column names",
          description:
            "Convert a list of camelCase JS object keys to snake_case before generating SQL DDL. Catches the inconsistencies SQL generators often miss.",
        },
        {
          title: "URL slug generation",
          description:
            "Convert article titles or section headings into lowercase kebab-case slugs ready for routing.",
        },
      ]}
      faqs={[
        {
          question: "How are acronyms handled?",
          answer:
            "Configurably. By default, multi-letter acronyms (URL, HTTP, ID) are treated as a single token — `userID` → `user_id`, not `user_i_d`. Toggle the acronym handling option to get the alternative.",
        },
        {
          question: "What about numbers?",
          answer:
            "Numbers are treated as part of the adjacent token: `version2Beta` → `version_2_beta`, `userID42` → `user_id_42`. The exact behaviour depends on the target case.",
        },
        {
          question: "Can I batch-convert a list?",
          answer:
            "Yes — paste a multi-line list and each line is converted independently. Useful for renaming a column list or a set of identifiers in bulk.",
        },
        {
          question: "What's the difference between PascalCase and camelCase?",
          answer:
            "PascalCase capitalises the first letter (`UserName`), camelCase keeps it lowercase (`userName`). Both join words by capitalisation. PascalCase is conventional for types / classes; camelCase for variables / functions.",
        },
        {
          question: "Why is `SCREAMING_SNAKE_CASE` an option?",
          answer:
            "It's the conventional case for constants in many languages (C, Python, JavaScript). Converting a config key list to SCREAMING_SNAKE makes them obviously immutable.",
        },
        {
          question: "Does my text leave the page?",
          answer:
            "No. Conversion is pure client-side. Safe for proprietary identifier lists, internal API names, and sensitive payloads.",
        },
      ]}
      relatedSlugs={["text-to-slug", "base64", "url-encoder", "regex-tester"]}
    />
  );
}
