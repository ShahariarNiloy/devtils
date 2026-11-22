/**
 * v2 presentation data per tool and category: glyph, accent tint, task tag,
 * short description and header tagline. Dependency-free (types only) so
 * client components — tool header, related tools, catalogue — can import it
 * without pulling the registry or tool components into the bundle.
 */

import type { ToolCategory } from "./types";
import type { Task } from "@/components/tools-catalogue/catalogue-types";

export type Tint = "clay" | "teal" | "sage" | "rose";

/** Category → accent family (palette §05). */
export const CATEGORY_TINT: Record<ToolCategory, Tint> = {
  JSON: "clay",
  Security: "clay",
  PDF: "rose",
  Code: "teal",
  Image: "teal",
  Network: "teal",
  Data: "teal",
  Text: "sage",
  Calc: "sage",
  "Next.js": "sage",
  Encoding: "rose",
  Design: "rose",
  React: "rose",
  SEO: "teal",
};

export interface ToolPresentation {
  /** At most 3 characters — it must stay readable in a 26–30px keycap. */
  glyph: string;
  task: Task;
  /** Short header subtitle (v2 tool page). Falls back to the registry description. */
  tagline?: string;
  desc?: string;
  /** Compact display name for cards ("JSON → TypeScript"). Defaults to the registry name. */
  label?: string;
  /** Related-tools card blurb, when it differs from `desc`. */
  card?: string;
  /** Accent override when the tool reads as another family (TS/Zod → teal). */
  tint?: Tint;
  /** JSON converters: rendered as a chip in the JSON panel. */
  conv?: { dir: "out" | "in"; short: string };
}

export const TOOL_PRESENTATION: Record<string, ToolPresentation> = {
  "json-formatter": { glyph: "{}", task: "format", desc: "Format, validate, query, tree view", tagline: "Format, validate, repair and explore." },
  "json-schema": { glyph: "§", task: "generate", desc: "Schema from sample JSON", card: "Schema from a sample", tagline: "Infer a draft 2020-12 or draft-07 schema from a sample." },
  "json-diff": { glyph: "±", task: "compare", desc: "Compare two JSON documents", card: "Compare two documents", tagline: "Compare two JSON documents as data, not text." },
  "json-to-typescript": { glyph: "TS", task: "convert", tint: "teal", label: "JSON → TypeScript", desc: "Types from any payload", tagline: "Paste a payload, get interfaces you can drop into your code.", conv: { dir: "out", short: "TypeScript" } },
  "json-to-zod": { glyph: "Z", task: "convert", tint: "teal", label: "JSON → Zod", desc: "Validators from JSON", conv: { dir: "out", short: "Zod" }, tagline: "Turn a sample payload into Zod validators and inferred types." },
  "json-to-go": { glyph: "Go", task: "convert", label: "JSON → Go", desc: "Structs with json tags", conv: { dir: "out", short: "Go" }, tagline: "Idiomatic Go structs with json tags, from any payload." },
  "json-to-python": { glyph: "Py", task: "convert", label: "JSON → Python", desc: "Dataclasses and models", conv: { dir: "out", short: "Python" }, tagline: "Dataclasses, TypedDicts or Pydantic models from JSON." },
  "json-to-rust": { glyph: "Rs", task: "convert", label: "JSON → Rust", desc: "serde structs", conv: { dir: "out", short: "Rust" }, tagline: "Serde-ready structs with snake_case fields and derives." },
  "json-to-yaml": { glyph: "Y", task: "convert", label: "JSON → YAML", desc: "JSON as readable YAML", conv: { dir: "out", short: "YAML" }, tagline: "Clean, readable YAML with safe quoting." },
  "json-to-xml": { glyph: "<>", task: "convert", label: "JSON → XML", desc: "Any JSON value as XML", conv: { dir: "out", short: "XML" }, tagline: "Well-formed XML with sensible element names." },
  "json-to-csv": { glyph: "C", task: "convert", label: "JSON → CSV", desc: "Arrays of objects as rows", conv: { dir: "out", short: "CSV" }, tagline: "Flatten arrays of objects into a spreadsheet-ready CSV." },
  "yaml-to-json": { glyph: "Y→", task: "convert", conv: { dir: "in", short: "YAML" }, tagline: "Convert YAML configs to JSON, with clear errors on bad indentation." },
  "csv-to-json": { glyph: "C→", task: "convert", conv: { dir: "in", short: "CSV" }, tagline: "Turn spreadsheet rows into typed JSON objects." },
  "regex-tester": { glyph: ".*", task: "inspect", desc: "Live match highlighting", tagline: "Write a pattern, see every match and group live." },
  "case-converter": { glyph: "Aa", task: "convert", desc: "camelCase, snake_case, kebab-case", tagline: "Every naming style at once — camel, snake, kebab and more." },
  "diff-checker": { glyph: "≠", task: "compare", desc: "Line-by-line text diff", tagline: "Compare two texts line by line, unified or side by side." },
  "markdown-preview": { glyph: "M↓", task: "inspect", desc: "Live Markdown rendering", tagline: "Write Markdown, see it rendered, copy clean HTML." },
  "word-counter": { glyph: "#w", task: "inspect", desc: "Words, characters, lines", tagline: "Words, characters, reading time and keyword density, live." },
  "timestamp-converter": { glyph: "⏱", task: "convert", desc: "Unix time to dates and back", tagline: "Unix seconds or milliseconds to dates, and back — in any time zone." },
  "uuid-generator": { glyph: "id", task: "generate", desc: "Generate UUIDs and ULIDs", tagline: "Generate UUID v4, v7 and ULIDs in bulk, with cryptographic randomness." },
  "cron-parser": { glyph: "*/", task: "inspect", desc: "Cron in plain words", tagline: "Read any cron schedule in plain English and see its next runs." },
  "chmod-calculator": { glyph: "755", task: "convert", desc: "Unix permissions, visually" },
  "sql-formatter": { glyph: "SQL", task: "format", desc: "Pretty-print SQL queries", tagline: "Turn one-line queries into readable, reviewable SQL." },
  "xml-formatter": { glyph: "<>", task: "format", desc: "Format and indent XML", tagline: "Indent or minify XML, and catch unclosed tags." },
  "code-formatter": { glyph: "</>", task: "format", desc: "Format common languages", tagline: "Beautify JavaScript, CSS and HTML in one place." },
  base64: { glyph: "64", task: "encode", desc: "Encode and decode Base64", tagline: "Encode or decode text and files, with URL-safe mode." },
  "url-encoder": { glyph: "%", task: "encode", desc: "Percent-encode URLs", tagline: "Percent-encode text for URLs, or decode it back." },
  "html-entity": { glyph: "&;", task: "encode", desc: "Escape and unescape HTML", tagline: "Escape text for HTML, or turn entities back into characters." },
  "jwt-decoder": { glyph: "JWT", task: "inspect", desc: "Header, payload, signature", tagline: "Decode, verify and debug tokens." },
  "password-generator": { glyph: "***", task: "generate", desc: "Strong, random passwords", tagline: "Strong passwords and passphrases, generated on your device." },
  "color-converter": { glyph: "#", task: "convert", desc: "HEX, RGB, HSL, OKLCH", tagline: "HEX, RGB, HSL and OKLCH, with contrast and a full scale." },
  "css-unit-converter": { glyph: "px", task: "convert", desc: "px, rem, em, vw and more", tagline: "Convert between px, rem, em, %, vw, vh and pt." },
  "image-compressor": { glyph: "⇲", task: "format", desc: "Compress to a size budget", tagline: "Smaller files, real sizes, a budget if you want one." },
  "blur-placeholder": { glyph: "▦", task: "generate", tint: "clay", desc: "LQIP for next/image, CSS, SVG", card: "blurDataURL, ThumbHash, BlurHash", tagline: "Tiny previews that show while images load." },
  "curl-to-code": { glyph: "$_", task: "convert", label: "cURL → code", desc: "fetch, axios, Python, Go, PHP", tagline: "fetch, axios, Python, Go and PHP from any curl command." },
  "curl-generator": { glyph: "$_", task: "generate", desc: "Build a curl command from a form", tagline: "Fill in a request, get a cURL command — for bash, cmd or PowerShell." },
  "curl-to-fetch": { glyph: "$_", task: "convert", label: "cURL → fetch", desc: "curl as fetch()", tagline: "Turn any curl command into fetch() for the browser or Node 18+." },
  "curl-to-axios": { glyph: "$_", task: "convert", label: "cURL → axios", desc: "curl as an axios request", tagline: "Turn any curl command into an axios request for Node or the browser." },
  "curl-to-python": { glyph: "$_", task: "convert", label: "cURL → Python", desc: "curl as Python requests", tagline: "Turn any curl command into Python requests code." },
  "curl-to-go": { glyph: "$_", task: "convert", label: "cURL → Go", desc: "curl as Go net/http", tagline: "Turn any curl command into Go net/http code." },
  "curl-to-php": { glyph: "$_", task: "convert", label: "cURL → PHP", desc: "curl as PHP Guzzle", tagline: "Turn any curl command into PHP code using Guzzle." },
  "merge-pdf": { glyph: "⧉", task: "convert", desc: "Combine, reorder, rotate pages", tagline: "Combine, reorder and rotate pages — without uploading." },
  "sign-pdf": { glyph: "✍", task: "generate", desc: "Draw, type or upload a signature", tagline: "Add your signature to a PDF — it never leaves your browser." },
  "split-pdf": { glyph: "✂", task: "convert", desc: "Pages, ranges or every page", tagline: "Pick pages, split every page, or cut it into ranges." },
  "compress-pdf": { glyph: "⇲", task: "convert", desc: "Smaller PDFs, text stays sharp", tagline: "Shrink photos and scans inside a PDF — text stays sharp." },
  "image-to-pdf": { glyph: "▣", task: "convert", desc: "Photos and scans into one PDF", tagline: "Photos, scans and screenshots into one PDF — no upload." },
  "pdf-to-image": { glyph: "▤", task: "convert", desc: "Pages to PNG, JPG, WebP", tagline: "Turn PDF pages into PNG, JPG or WebP — on your device." },
  "url-parser": { glyph: "://", task: "inspect", desc: "Break a URL into its parts", tagline: "Break a URL into parts and clean up its query string." },
  "hreflang-generator": { glyph: "hl", task: "generate", desc: "Tags for every language and region", tagline: "Build hreflang tags for every language and region, with x-default." },
  "hreflang-validator": { glyph: "hl✓", task: "inspect", desc: "Find hreflang mistakes on a page", tagline: "Paste a page's head and find every hreflang mistake." },
  "hreflang-sitemap": { glyph: "hlx", task: "generate", desc: "Alternates in sitemap.xml", tagline: "Turn a page × locale table into a sitemap with xhtml:link alternates." },
  "canonical-generator": { glyph: "rel", task: "generate", desc: "Clean, consistent canonical URLs", tagline: "Clean any URL into a consistent canonical, then copy the tag." },
  "robots-txt-generator": { glyph: "bot", task: "generate", desc: "Rules plus a path tester", tagline: "Build robots.txt rules and test any path against them." },
  "sitemap-validator": { glyph: "sm✓", task: "inspect", desc: "Catch sitemap format errors", tagline: "Paste a sitemap and catch format, URL and date errors." },
  "open-graph-generator": { glyph: "og", task: "generate", desc: "Share-card tags and preview", tagline: "Write share-card tags and preview how links will look." },
  "meta-preview": { glyph: "srp", task: "inspect", desc: "Title and description fit", tagline: "See how your title and description fit in search results." },
  "json-ld-generator": { glyph: "{L}", task: "generate", desc: "Structured data for rich results", tagline: "Structured data for articles, products, organisations, FAQs and breadcrumbs." },
};

export const CATEGORY_GLYPH: Partial<Record<ToolCategory, string>> = {
  JSON: "{}",
  Text: "Aa",
  Calc: "∑",
  Code: "</>",
  Encoding: "64",
  Security: "⚿",
  Design: "#",
  Image: "▢",
  Network: "⇄",
  SEO: "SEO",
  PDF: "▤",
};
