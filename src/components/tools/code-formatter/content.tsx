import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  usesNote: "Clean up snippets before you share them.",
  intro:
    "Format JavaScript, TypeScript, JSON, CSS, HTML, Markdown, YAML, and GraphQL with Prettier — the same rules your editor runs locally. Pick a language, paste, and the output matches what `prettier --write` would produce. Configurable indent, line width, quotes, and trailing commas. Everything runs in your browser; nothing is uploaded.",
  useCases: [
    {
      title: "Reformatting code pasted from a chat or PR",
      description:
        "Paste a minified or oddly-indented snippet a teammate sent and get it back in your project's style before reading it.",
    },
    {
      title: "Pretty-printing JSON from an API response",
      description:
        "Paste a one-line JSON blob from curl or Postman. The output is the same as `prettier --parser json` — drop it into a fixture file with no further cleanup.",
    },
    {
      title: "Normalising CSS from inspector copy",
      description:
        "DevTools sometimes outputs CSS in a single line. The CSS formatter rewrites it with consistent indentation and selectors per line.",
    },
    {
      title: "Cleaning up Markdown drafts",
      description:
        "Fixes irregular list markers, excessive blank lines, and inconsistent emphasis — produces a clean version ready for the docs PR.",
    },
  ],
  faqs: [
    {
      question: "Does this use the same rules as Prettier in my editor?",
      answer:
        "Yes — this runs the actual `prettier` package via the standalone build, with per-language parser plugins loaded on demand. The options exposed (tabWidth, printWidth, semi, singleQuote, trailingComma, bracketSpacing) map 1:1 to Prettier's. The output is character-for-character what `prettier --write` would produce locally with the same options.",
    },
    {
      question: "Which languages are supported?",
      answer:
        "JavaScript, TypeScript, JSX, TSX, JSON, JSON5, CSS, SCSS, Less, HTML, Vue, Markdown, YAML, and GraphQL. Each language uses Prettier's official parser plugin for that language.",
    },
    {
      question: "Why is the first format on a new language slightly slower?",
      answer:
        "Prettier's parser plugins are code-split chunks. The first format for a given language downloads its parser; subsequent formats are instant. Picking 'JSON' downloads ~100 KB; 'HTML' downloads ~200 KB. Pages aren't paying for parsers they don't use.",
    },
    {
      question: "Does my code leave the browser?",
      answer:
        "No. Prettier's standalone build runs entirely in your browser — there is no network call to format. Safe for proprietary code, secrets, or anything you wouldn't paste into a public pastebin.",
    },
    {
      question: "What happens if my code has a syntax error?",
      answer:
        "The parse error is shown verbatim in the output pane with the line number Prettier reported, and the output is cleared so you don't mistake an old result for the formatted version.",
    },
    {
      question: "Can I configure trailing commas, single quotes, etc.?",
      answer:
        "Yes. The toolbar has the language and a 2- or 4-space indent. The ⋯ menu holds the rest: 8-space or tab indent, print width (80/100/120), semicolons, single quotes, bracket spacing and trailing commas (all/es5/none).",
    },
    {
      question: "Why is Prettier the default, not Biome?",
      answer:
        "Prettier is what ~95% of JS devs already run locally, so its output is what users expect to see. Biome is faster but produces slightly different output — for a paste-and-format tool, matching the user's editor is more valuable than format speed.",
    },
  ],
  relatedSlugs: ["sql-formatter", "xml-formatter", "json-formatter", "css-unit-converter"],
} as const;

export function CodeFormatterContent() {
  return <ToolContent {...seoData} />;
}
