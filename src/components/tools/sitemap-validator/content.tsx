import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Paste a sitemap.xml or a sitemap index and get every format, URL and date problem in one list. The validator checks the XML declaration, the sitemaps.org namespace, that tags are balanced and closed, a <loc> on every entry, absolute URLs on one host, duplicates, unescaped ampersands, lastmod dates, changefreq values, priority ranges and the 50,000-URL and 50 MB limits. Each entry gets its own row, so you can see which URL has which problem. The XML is only read as text; your site is never fetched.",
  usesNote: "Make sure crawlers can read every URL.",
  useCases: [
    { title: "Before you submit", description: "Catch errors before Search Console does." },
    { title: "Debug a CMS sitemap", description: "Find bad dates, wrong hosts and duplicates." },
    { title: "Check sitemap indexes", description: "Works with both urlset and sitemapindex files." },
  ],
  faqs: [
    {
      question: "What's checked?",
      answer:
        "The XML declaration, the namespace, balanced and closed tags, declared prefixes for image or video extensions, a loc on every entry, absolute same-host URLs, duplicates, unescaped &, URL length, lastmod format, changefreq and priority.",
    },
    {
      question: "Do priority and changefreq matter?",
      answer: "Google ignores them. An accurate lastmod helps.",
    },
    {
      question: "Which date formats does lastmod accept?",
      answer:
        "W3C datetime: 2026-11-20, or a full timestamp with a time zone like 2026-11-20T14:30:00+00:00. Formats like 20/11/2026 are rejected, and dates in the future are flagged.",
    },
    {
      question: "Why does every URL need the same host?",
      answer:
        "A sitemap may only list URLs from the host it's served on. The validator uses the first URL's host as the reference and flags any entry on a different host, like a CDN or another subdomain.",
    },
    {
      question: "Is this a full XML schema validation?",
      answer:
        "No. It checks structure and every rule in the sitemaps.org protocol, but it doesn't load the XSD. Extension tags like image:image are only checked for a declared namespace.",
    },
    {
      question: "Can it fetch my sitemap?",
      answer: "No. Paste the XML; nothing is requested.",
    },
  ],
  relatedSlugs: ["robots-txt-generator", "hreflang-sitemap", "canonical-generator", "json-ld-generator"],
} as const;

export function SitemapValidatorContent() {
  return <ToolContent {...seoData} />;
}
