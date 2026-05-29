import { ToolContent } from "@/components/json-converter";

export function JsonToCsvContent() {
  return (
    <ToolContent
      intro="Convert arrays of JSON objects to CSV with the small but important details that make CSV interop work: configurable delimiter for EU locales (semicolon), dot-notation flattening for nested objects, optional UTF-8 BOM for Excel encoding detection, and CRLF line endings for Windows-friendly output. Nested arrays serialize as embedded JSON inside the cell so the column count stays predictable."
      useCases={[
        {
          title: "Exporting API data to spreadsheets",
          description:
            "Fetch a list endpoint, paste the JSON, get a CSV ready for Excel / Google Sheets. Turn on BOM if Excel mis-detects encoding on emoji / accented characters.",
        },
        {
          title: "Generating fixtures for database imports",
          description:
            "Most databases support CSV import (Postgres `COPY`, MySQL `LOAD DATA`). Convert your JSON test data once, import many times.",
        },
        {
          title: "Sending a one-off data extract to non-technical stakeholders",
          description:
            "Spreadsheets are still the universal data format. CSV opens cleanly in every spreadsheet app, no auth or shared infra required.",
        },
        {
          title: "Generating reports from log dumps",
          description:
            "Pipe a JSON-line log through `jq -s` to wrap it in an array, paste here, get a CSV for downstream analysis.",
        },
      ]}
      faqs={[
        {
          question: "Why does my input need to be an array of objects?",
          answer:
            "CSV is a flat 2D table — rows of fields. Without a top-level array of objects, there's no natural way to map JSON to rows and columns. Wrap a single object in `[...]` if you need one row.",
        },
        {
          question: "How are nested objects handled?",
          answer:
            "Flattened with the delimiter you choose (default `.`). `{address: {city: \"x\"}}` becomes a column called `address.city`. Use `/` or `_` if your downstream tool doesn't like dots in column names.",
        },
        {
          question: "What happens to arrays inside an object?",
          answer:
            "Embedded as JSON in the cell, e.g. `[\"a\",\"b\"]`. This preserves the data without exploding column count (which would happen with index-suffixed columns). Re-parse downstream with `JSON.parse(row.tags)`.",
        },
        {
          question: "Why would I want a BOM?",
          answer:
            "Excel on Windows guesses file encoding and will mis-detect UTF-8 as Windows-1252, mangling accented characters and emoji. A UTF-8 BOM (0xEF 0xBB 0xBF) tells Excel the encoding explicitly. Modern tools ignore the BOM if present.",
        },
        {
          question: "Why does the EU prefer `;` over `,`?",
          answer:
            "In most European locales the decimal mark is `,`, which clashes with comma-delimited CSV. Excel in those locales defaults to semicolon CSV instead.",
        },
        {
          question: "When should I use CRLF line endings?",
          answer:
            "Strict CSV (RFC 4180) requires CRLF. Most modern tools accept LF, but if your output is going to a Windows-only tool or a strict parser, turn on CRLF.",
        },
      ]}
      relatedSlugs={["csv-to-json", "json-to-yaml", "json-to-xml", "json-formatter"]}
    />
  );
}
