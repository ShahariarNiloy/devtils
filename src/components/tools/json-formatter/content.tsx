import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro: "A full JSON workspace: format, minify, validate, sort, repair, and explore. The editor draws only the lines on screen, so typing stays instant even in multi-megabyte documents. Five view modes — Code, Tree, Table, Graph, Path — let you pick the right lens for the document at hand. JSONPath queries, fuzzy search, structural diff, and ten output formats round out the tool.",
  usesTitle: "What people use it for",
  usesNote: "Five jobs it does better than a text editor.",
  useCases: [
        {
          tag: "API",
          tint: "clay",
          title: "Debugging an API response",
          description:
            "Paste the raw response, validate it, and use Tree view to drill into the shape. JSONPath quickly extracts specific values without manual navigation.",
        },
        {
          tag: "{…}",
          tint: "teal",
          title: "Cleaning up minified JSON from network tools",
          description:
            "Copy a long single-line JSON blob from DevTools / Postman / curl output, paste it here for instant pretty-printing with line numbers.",
        },
        {
          tag: "fix",
          tint: "rose",
          title: "Repairing broken JSON from LLM output",
          description:
            "Use the Repair feature to fix trailing commas, single quotes, unquoted keys, and other near-miss invalidities that JSON.parse would reject.",
        },
        {
          tag: "±",
          tint: "sage",
          title: "Comparing two API responses",
          description:
            "Open JSON diff (under More JSON tools) to see exactly what changed — added, removed, and changed keys, with structural awareness rather than line-by-line text diff.",
        },
        {
          tag: "→",
          tint: "clay",
          title: "Converting between formats",
          description:
            "One-click conversion to YAML, CSV, XML, JSON Schema, or directly to TypeScript / Go / Python / Rust / Zod types from the Convert to… menu or the chips under the editor.",
        },
      ],
  faqs: [
        {
          question: "Does my JSON leave my browser?",
          answer:
            "No. Formatting, validation and repair run in your browser, and what you paste is processed there, not uploaded to us. The one network request is one you start yourself: Fetch from URL loads that endpoint straight from your browser. Safe to use with sensitive payloads, internal API responses, or production data.",
        },
        {
          question: "How large a JSON file can it handle?",
          answer:
            "Paste any size; uploaded files can be up to 50 MB. The editor only draws the lines on screen, so typing stays instant even on a 20 MB document, and parsing above ~250 KB runs in a background worker so the page never freezes. Above 1 MB, syntax colouring switches off (like VS Code does for huge files) to keep keystrokes fast. Some extras scale back on very large documents: drafts over 1 MB aren't autosaved, and share links are limited to about 256 KB compressed.",
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
            "Yes — use Sort keys in the toolbar (click it again to flip between A → Z and Z → A). Useful for diff-friendly check-ins and canonical JSON.",
        },
      ],
  relatedSlugs: [
        "json-diff",
        "json-schema",
        "json-to-typescript",
        "json-to-zod",
        "json-to-yaml",
        "json-to-csv",
      ],
} as const;

export function JsonFormatterContent() {
  return <ToolContent {...seoData} />;
}
