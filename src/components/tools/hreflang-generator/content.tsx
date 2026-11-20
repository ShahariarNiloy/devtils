import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Build a complete set of hreflang tags for every language and region version of a page, plus an x-default fallback. Codes are checked against ISO 639-1 and ISO 3166-1 as you type, so mistakes like en-UK or es-LA are caught before they ship. Output as HTML link tags, an HTTP Link header or sitemap entries. Everything runs in your browser; nothing is fetched.",
  usesNote: "International SEO without the guesswork.",
  useCases: [
    { title: "Launch a new locale", description: "Generate the full set of tags for every page." },
    { title: "Pick the format", description: "HTML head tags, HTTP headers or sitemap entries." },
    { title: "Catch bad codes", description: "en-UK and es-LA get flagged before they ship." },
  ],
  faqs: [
    {
      question: "Language or language-region?",
      answer: "Use just the language (de) unless content differs by country (de-AT, de-CH).",
    },
    {
      question: "What is x-default?",
      answer: "The page for visitors whose language you don't target — often a language picker.",
    },
    {
      question: "Do pages need to link back?",
      answer: "Yes. Every page in the set must list all the others and itself. Search engines ignore alternates that aren't confirmed by a return link.",
    },
    {
      question: "Which output format should I use?",
      answer:
        "HTML link tags in the head are the most common. Use the HTTP Link header for non-HTML files such as PDFs, and sitemap entries when editing every template is impractical. Pick one method per page set, not several.",
    },
    {
      question: "Does the tool check my live site?",
      answer: "No. It only validates what you type. It never requests your pages, so it can't confirm that the URLs exist or return 200.",
    },
  ],
  relatedSlugs: ["hreflang-validator", "hreflang-sitemap", "canonical-generator", "sitemap-validator"],
} as const;

export function HreflangGeneratorContent() {
  return <ToolContent {...seoData} />;
}
