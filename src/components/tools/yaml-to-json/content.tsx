import { ToolContent } from "@/components/shared/tool-content";

/**
 * SEO + discoverability block for the YAML → JSON tool. Copy describes
 * what the parser really does: YAML 1.2 core schema, merge keys,
 * multi-document streams as arrays, line/column errors.
 */
export const seoData = {
  intro:
    "Paste YAML and get JSON your code can JSON.parse. The converter uses js-yaml with the YAML 1.2 core schema, so dates stay the strings you wrote and nothing turns into a type JSON can't hold. Anchors, aliases and << merge keys are resolved, several documents separated by --- become a JSON array, and a parse error names the exact line and column. Everything runs in your browser.",
  usesNote: "Configs your code can JSON.parse.",
  useCases: [
    {
      title: "CI and Kubernetes",
      description: "Inspect a GitHub Actions workflow, Helm values file or manifest as JSON to see exactly how it parses.",
      tag: "config",
      tint: "clay",
    },
    {
      title: "Feed an API",
      description: "Most APIs want JSON, most configs are YAML. Convert once and paste the body into your request.",
      tag: "API",
      tint: "teal",
    },
    {
      title: "Catch indentation bugs",
      description: "A key nested one level too deep shows up immediately in the JSON, and broken indentation is reported with its line number.",
      tag: "debug",
      tint: "sage",
    },
  ],
  faqs: [
    {
      question: "Which YAML features work?",
      answer:
        "Maps, lists, nested blocks, quoted and multi-line strings, comments, flow [lists] and {maps}, anchors and aliases, << merge keys, and multiple documents separated by ---.",
    },
    {
      question: "What happens to yes, no, on and off?",
      answer:
        "They stay strings. The parser follows YAML 1.2, where only true and false are booleans. YAML 1.1 tools treat yes/no as booleans, so write true/false if you mean a boolean.",
    },
    {
      question: "What about multiple documents?",
      answer: "A stream with several documents separated by --- is returned as a JSON array, one item per document. A single document is returned as-is.",
    },
    {
      question: "Are dates converted?",
      answer:
        "No. A value like 2026-03-02 stays the string \"2026-03-02\" instead of being turned into a timestamp, so the JSON matches what you wrote.",
    },
    {
      question: "Why does it say my YAML is invalid?",
      answer:
        "The error message comes straight from the parser and includes the line and column, and that line is marked in the editor. Mixed tabs and spaces and a missing space after a colon are the usual causes.",
    },
    {
      question: "Is my YAML uploaded anywhere?",
      answer: "No. Parsing and conversion happen in your browser and nothing is sent to a server.",
    },
  ],
  relatedSlugs: ["csv-to-json", "json-to-yaml", "json-formatter", "json-diff"],
} as const;

export function YamlToJsonContent() {
  return <ToolContent {...seoData} />;
}
