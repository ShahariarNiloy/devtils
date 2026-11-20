import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Paste a page's head, or just its link tags, and see every hreflang mistake: invalid language or region codes, relative or http URLs, duplicates, a missing x-default, a missing self-reference and a canonical that points somewhere else. You get a per-tag audit and a corrected set to copy back into your template. The HTML is read in your browser; your site is never requested.",
  usesNote: "Find out why your alternates are ignored.",
  useCases: [
    { title: "Audit a template", description: "Check the tags your CMS actually outputs." },
    { title: "Fix before launch", description: "Invalid codes, relative URLs and missing self-references." },
    { title: "Get corrected tags", description: "Copy a fixed set straight back into your template." },
  ],
  faqs: [
    {
      question: "Which errors are caught?",
      answer:
        "Invalid language or region codes, relative or http URLs, duplicates, missing x-default, missing self-reference and canonical conflicts.",
    },
    {
      question: "Can it check return links?",
      answer: "Not from one page. Validate each page in the set, or use the sitemap tool to keep them in sync.",
    },
    {
      question: "Does it fetch my site?",
      answer: "No. Paste the HTML; nothing is requested.",
    },
    {
      question: "What does the corrected set change?",
      answer:
        "It normalises codes (en-uk becomes en-GB, regions are uppercased), switches http to https, resolves relative URLs against the page URL you entered, drops duplicates and adds a self-reference if one is missing. Codes it can't fix are kept with a comment so you can replace them.",
    },
    {
      question: "Why does the canonical matter for hreflang?",
      answer:
        "Search engines only use hreflang on the canonical version of a page. If the canonical points to a different URL, the alternates on this page are ignored.",
    },
  ],
  relatedSlugs: ["hreflang-generator", "hreflang-sitemap", "canonical-generator", "meta-preview"],
} as const;

export function HreflangValidatorContent() {
  return <ToolContent {...seoData} />;
}
