import { ToolContent } from "@/components/shared/tool-content";

/**
 * SEO + discoverability block for the CSV → JSON tool. Copy matches the
 * parser: RFC 4180 quoting, delimiter detection, type inference and
 * dotted-column nesting.
 */
export const seoData = {
  intro:
    "Paste CSV from a spreadsheet export and get an array of JSON objects, one per row. The parser follows RFC 4180, so quoted fields with commas, line breaks and escaped quotes come through intact. It detects the delimiter from the first line, can turn numbers and booleans into real JSON types, and can nest columns named like stats.stars into objects. Nothing leaves your browser.",
  usesNote: "From a spreadsheet to an API.",
  useCases: [
    {
      title: "Seed data",
      description: "Export a sheet, paste it here and get fixtures for tests or a database seed script.",
      tag: "fixtures",
      tint: "clay",
    },
    {
      title: "Bulk imports",
      description: "Prepare rows for an API that wants a JSON array instead of a file upload.",
      tag: "API",
      tint: "teal",
    },
    {
      title: "Typed values",
      description: "Numbers and true/false come through as real JSON types, and empty cells become null.",
      tag: "types",
      tint: "sage",
    },
  ],
  faqs: [
    {
      question: "Which delimiter does it use?",
      answer:
        "Auto looks at the first line and picks whichever of comma, semicolon or tab appears most often outside quotes. You can also pick one yourself.",
    },
    {
      question: "What does Infer types do?",
      answer:
        "Cells that look like numbers become numbers, true and false become booleans, and empty cells become null. Numbers with leading zeros (like 007) and integers too large to represent exactly stay strings so nothing is lost. Turn it off to keep every value as a string.",
    },
    {
      question: "What does Nest a.b columns do?",
      answer:
        "A column named stats.stars becomes { \"stats\": { \"stars\": … } }. If a plain column and a dotted column collide, the dotted one keeps its flat name rather than overwriting data.",
    },
    {
      question: "Are quoted fields handled?",
      answer:
        "Yes, including delimiters, line breaks and doubled quotes (\"\") inside them. An unclosed quote is reported as an error instead of silently swallowing the rest of the file.",
    },
    {
      question: "What if there's no header row?",
      answer: "Turn off Header row and the columns are named column1, column2 and so on.",
    },
    {
      question: "What about rows with missing or extra cells?",
      answer:
        "Missing cells are filled with an empty value (null when types are inferred). Extra cells beyond the header get their own columnN keys, so no data is dropped.",
    },
  ],
  relatedSlugs: ["json-to-csv", "yaml-to-json", "json-formatter", "json-schema"],
} as const;

export function CsvToJsonContent() {
  return <ToolContent {...seoData} />;
}
