import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Escape text so it shows up as text inside HTML, or turn entity references like &amp; and &#233; back into characters. Encoding covers the five characters that matter, with an option for every non-ASCII character too. It all runs in your browser.",
  usesNote: "Show code in HTML without breaking the page.",
  useCases: [
    {
      tag: "<>",
      tint: "clay",
      title: "Code in docs",
      description: "Display <tags> and snippets as text in a blog post, README or CMS field instead of having the browser render them.",
    },
    {
      tag: "&lt;",
      tint: "rose",
      title: "Prevent injection",
      description: "Escape user-supplied text before it lands in HTML text or a quoted attribute.",
    },
    {
      tag: "&amp;",
      tint: "teal",
      title: "Clean up CMS output",
      description: "Decode &amp;amp; soup, &nbsp; runs and numeric references back into readable text.",
    },
  ],
  faqs: [
    {
      question: "Which characters are escaped?",
      answer:
        "& < > \" and ', the five that matter in HTML text and attributes. Turn on “Escape non-ASCII too” to escape everything outside ASCII as well, and turn off quote escaping in the ⋯ menu if the text only goes into element content.",
    },
    {
      question: "Named or numeric entities?",
      answer:
        "Decoding understands numeric references (&#233; and &#xE9;) and about 240 common named entities. Encoding uses numeric references for non-ASCII by default; switch on named entities in the ⋯ menu to get &copy; or &eacute; where a name exists.",
    },
    {
      question: "What happens to entities it doesn't know?",
      answer:
        "They're left exactly as written, and the status bar counts them so you can check. Numeric references that point outside Unicode become �, as browsers do.",
    },
    {
      question: "Is this enough to stop XSS?",
      answer:
        "It's the right escaping for HTML text and quoted attributes. Other contexts — inline scripts, styles, URLs in href — need their own encoding, so don't rely on this alone there.",
    },
    {
      question: "Does it handle emoji?",
      answer: "Yes. Characters are processed by code point, so an emoji becomes a single entity like &#x1F600;, not two broken halves.",
    },
  ],
  relatedSlugs: ["url-encoder", "markdown-preview", "base64", "code-formatter"],
} as const;

export function HtmlEntityContent() {
  return <ToolContent {...seoData} />;
}
