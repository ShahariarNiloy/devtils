import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Format and validate XML for any flavor — SVG, SOAP, RSS / Atom, Maven POM, Android layouts, or generic XML. Auto-detects the document type from its root element. Three modes: format (pretty-print), minify (single-line), or convert to JSON. Runs entirely in your browser — pasted XML never leaves the tab.",
  useCases: [
    {
      title: "Reading SOAP responses from legacy APIs",
      description:
        "Paste a one-line SOAP envelope, see properly indented Header / Body / fault hierarchy with namespaces preserved. Switch to JSON mode to drop the response into a modern client library.",
    },
    {
      title: "Inspecting an SVG export from a design tool",
      description:
        "Figma / Illustrator exports often emit minified SVG. The SVG flavor preset preserves the viewBox and keeps short-attribute elements compact while breaking complex paths onto their own lines.",
    },
    {
      title: "Cleaning a Maven POM before review",
      description:
        "The POM flavor applies 4-space indent and groups attributes onto single lines, matching the Maven team's house style. Drag your `pom.xml` in — auto-detection takes care of the rest.",
    },
    {
      title: "Converting an RSS or Atom feed to JSON",
      description:
        "Paste any feed, switch to JSON mode. Attributes prefix with `@`, text nodes use `#text`. The resulting JSON works with `fetch` callers that expect a JSON Content-Type.",
    },
  ],
  faqs: [
    {
      question: "Which XML flavors are supported?",
      answer:
        "SVG, SOAP envelopes, RSS, Atom, Maven POM, Android layouts, and a generic ANSI XML fallback. Auto detection sniffs the root element and the first xmlns declaration — drop a file in and we pick the right preset. Per-flavor formatting choices (indent, attribute layout, comment preservation) are layered on top of any explicit options you set.",
    },
    {
      question: "Does my XML leave the browser?",
      answer:
        "No. fast-xml-parser runs as a code-split chunk in your browser; format, minify, and JSON conversion all execute locally. Safe for SOAP responses with embedded credentials, internal Maven configs, or anything you wouldn't paste into a public pastebin.",
    },
    {
      question: "How does XML → JSON conversion work?",
      answer:
        "We follow the Mozilla-ish convention: attributes prefix with `@`, text nodes use `#text`. So `<foo bar=\"1\">hi</foo>` becomes `{ \"foo\": { \"@bar\": \"1\", \"#text\": \"hi\" } }`. The convention is lossy for mixed content (text and elements interleaved) — that's an XML-as-document feature JSON can't represent — but works perfectly for data-shaped XML like SOAP, RSS, and POM.",
    },
    {
      question: "Will it change my XML's meaning?",
      answer:
        "No — only whitespace, indentation, and (optionally) attribute order. Element text, attribute values, CDATA sections, and processing instructions are preserved exactly. The Diff view shows you which lines moved or split, so you can verify nothing semantic has shifted.",
    },
    {
      question: "What's the difference between Format, Minify, and JSON?",
      answer:
        "Format pretty-prints with the chosen indent. Minify collapses to a single line and strips comments — useful for stuffing XML into a JSON string field or a YAML literal. JSON converts to the standard XML-as-JSON shape and lets you copy/download as `.json`.",
    },
    {
      question: "Why are some options greyed out in Minify or JSON mode?",
      answer:
        "Mode-specific. Self-closing style, comment preservation, attribute sorting, namespace stripping, and XML declaration handling only apply to Format mode (where they affect the rendered output). Minify always strips comments and collapses whitespace; JSON conversion has its own mapping conventions.",
    },
    {
      question: "Are there keyboard shortcuts?",
      answer:
        "`/` focuses the input, `⌘⇧C` copies the output, `⌘⇧M` toggles Minify, `⌘⇧J` toggles JSON. The flavor picker remembers your last selection in localStorage.",
    },
  ],
  relatedSlugs: ["json-formatter", "sql-formatter", "code-formatter", "diff-checker"],
} as const;

export function XmlFormatterContent() {
  return <ToolContent {...seoData} />;
}
