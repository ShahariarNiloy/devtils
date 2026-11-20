import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Turn a page × locale table into a sitemap.xml with xhtml:link alternates. Paste columns straight from a spreadsheet: one header row of locale codes, then one row per page with the URL of each version. Every version gets its own <url> entry that lists every alternate, including itself, so return links are always in place. Built in your browser; nothing is uploaded.",
  usesNote: "Hreflang for thousands of pages, in one file.",
  useCases: [
    { title: "Large sites", description: "Easier than adding tags to every template." },
    { title: "From a spreadsheet", description: "Paste columns straight from your URL mapping sheet." },
    { title: "Always reciprocal", description: "Every URL lists every alternate, so return links are guaranteed." },
  ],
  faqs: [
    {
      question: "Sitemap or head tags?",
      answer: "Either works. Use one method, not both, to avoid conflicts.",
    },
    {
      question: "What if a page has no translation?",
      answer: "Leave the cell empty. That locale is skipped for that page only.",
    },
    {
      question: "Size limits?",
      answer: "50,000 URLs or 50 MB per sitemap. Split larger sets with a sitemap index. The tool warns you when the output passes either limit.",
    },
    {
      question: "What date does lastmod use?",
      answer:
        "Today's date, for every entry. Only keep it on if the pages really changed today; otherwise turn it off rather than publishing dates that aren't true.",
    },
    {
      question: "Can cells contain commas?",
      answer: "Yes, if the cell is wrapped in double quotes, as spreadsheets do when exporting CSV. Tab-separated paste works too.",
    },
  ],
  relatedSlugs: ["hreflang-generator", "hreflang-validator", "sitemap-validator", "robots-txt-generator"],
} as const;

export function HreflangSitemapContent() {
  return <ToolContent {...seoData} />;
}
