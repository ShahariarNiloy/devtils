import { ToolContent } from "@/components/json-converter";

export const seoData = {
  intro: `Convert any JSON value to XML with custom root and array-item tags. Element names that start with a digit or special character get prefixed with \`_\` to stay XML-spec-valid; null values emit \`<tag nil="true"/>\`; arrays expand to repeated sibling elements. Useful when interfacing with legacy systems, SOAP services, or RSS / Atom generators that need XML on the wire.`,
  useCases: [
    {
      title: "Driving legacy SOAP / WSDL endpoints",
      description:
        "Many enterprise integrations still expect XML payloads. Convert your JSON request shape once, use the result as a template for hand-tuning XML namespaces.",
    },
    {
      title: "Generating RSS / Atom feeds",
      description:
        "If you already model feed items as JSON internally, convert to XML for the final serialization. Customize the root and item tags to match RSS conventions (`channel` / `item`).",
    },
    {
      title: "Sitemap generation",
      description:
        "Use `urlset` as the root tag and `url` as the item tag to produce sitemap.xml-shaped output that you can then tag with the `xmlns` attribute by hand.",
    },
    {
      title: "Translating between API formats",
      description:
        "When a backend returns JSON but a downstream consumer expects XML (or vice versa for debugging), this tool gives you a 1:1 starting point.",
    },
  ],
  faqs: [
    {
      question: "Why do some tags start with `_`?",
      answer:
        "XML element names must start with a letter or underscore, never a digit or special character. Keys like `1st` become `_1st` so the output stays well-formed.",
    },
    {
      question: "How are JSON arrays represented?",
      answer:
        "Each array item becomes its own element with the tag name you set ('Item tag' option, default `item`). So `tags: [\"a\", \"b\"]` becomes `<tags><item>a</item><item>b</item></tags>`.",
    },
    {
      question: 'What does `<tag nil="true"/>` mean?',
      answer:
        'How JSON `null` is conveyed in XML — the element exists but explicitly carries a `nil="true"` attribute. Mirrors the convention used by `xsi:nil`. Strip the attribute if your consumer prefers absence.',
    },
    {
      question: "Can I emit XML attributes instead of nested elements?",
      answer:
        "Not currently — every JSON property becomes a child element. JSON has no notion of attribute-vs-content distinction, so any mapping has to be opinionated. A future option may surface this for specific keys.",
    },
    {
      question: "Is the output XML 1.0 or 1.1?",
      answer:
        'The declaration uses `version="1.0"` (the safe default — XML 1.1 added support for additional control characters that almost no parser supports).',
    },
    {
      question: "Should I include the XML declaration?",
      answer:
        "Include it when the output is a standalone document. Strip it when embedding the XML inside a larger document (the declaration is only valid at the top).",
    },
  ],
  relatedSlugs: ["json-to-yaml", "json-to-csv", "json-formatter"],
} as const;

export function JsonToXmlContent() {
  return <ToolContent {...seoData} />;
}
