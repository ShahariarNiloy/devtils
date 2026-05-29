import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro: "A full JSON workspace: format, minify, validate, sort, repair, and explore. The editor supports overlay-style syntax highlighting that stays sub-frame for inputs up to ~100KB, then degrades gracefully for multi-MB pastes. Four view modes — Code, Tree, Table, Graph — let you pick the right lens for the document at hand. JSONPath queries, fuzzy search, structural diff, and ten output formats round out the tool.",
  useCases: [
        {
          title: "Debugging an API response",
          description:
            "Paste the raw response, validate it, and use Tree view to drill into the shape. JSONPath quickly extracts specific values without manual navigation.",
        },
        {
          title: "Cleaning up minified JSON from network tools",
          description:
            "Copy a long single-line JSON blob from DevTools / Postman / curl output, paste it here for instant pretty-printing with line numbers.",
        },
        {
          title: "Repairing broken JSON from LLM output",
          description:
            "Use the Repair feature to fix trailing commas, single quotes, unquoted keys, and other near-miss invalidities that JSON.parse would reject.",
        },
        {
          title: "Comparing two API responses",
          description:
            "Drop both into the Diff view to see exactly what changed — added, removed, and changed keys, with structural awareness rather than line-by-line text diff.",
        },
        {
          title: "Converting between formats",
          description:
            "One-click conversion to YAML, CSV, XML, JSON Schema, or directly to TypeScript / Go / Python / Rust / Zod types from the Convert dropdown.",
        },
      ],
  faqs: [
        {
          question: "Does my JSON leave my browser?",
          answer:
            "No. The entire tool runs client-side. No network calls, no telemetry on input contents, nothing leaves your device. Safe to use with sensitive payloads, internal API responses, or production data.",
        },
        {
          question: "Why does the formatter feel slow on huge inputs?",
          answer:
            "Above ~100KB the syntax highlighter degrades to plain text to keep keystrokes responsive. Above ~1MB the parser also runs in a Web Worker. You may still see a moment of pause on the initial load — but typing should stay smooth.",
        },
        {
          question: "What does the Repair feature do?",
          answer:
            "Fixes common near-miss invalidities: trailing commas, single-quoted strings, unquoted keys, JavaScript-style comments. Useful for JSON5 / JSONC files and LLM-generated output. It's lossless — the repair preview shows exactly what was changed.",
        },
        {
          question: "Can I share a formatted document?",
          answer:
            "Click the share icon to generate a URL with the document encoded as a hash fragment. Hash fragments aren't sent in HTTP requests, so the contents stay between sender and receiver.",
        },
        {
          question: "What's the difference between Tree, Table, and Graph views?",
          answer:
            "Tree: collapsible hierarchical view, best for deeply nested objects. Table: each row is an array item, each column a key — best for array-of-records data. Graph: SVG node-and-edge visualization of structure, best for understanding relationships in unfamiliar documents.",
        },
        {
          question: "How does JSONPath search work?",
          answer:
            "Standard JSONPath syntax: `$.users[*].name` to extract all user names, `$..email` to find every `email` field at any depth. Hit Enter in the search panel and matching paths are highlighted in the editor.",
        },
        {
          question: "Can I sort keys?",
          answer:
            "Yes — use the Sort dropdown for ascending / descending key sort. Useful for diff-friendly check-ins and canonical JSON.",
        },
      ],
  relatedSlugs: [
        "json-to-typescript",
        "json-to-zod",
        "json-to-yaml",
        "json-schema",
        "json-to-csv",
      ],
} as const;

export function JsonFormatterContent() {
  return <ToolContent {...seoData} />;
}
