import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Clean any URL into a consistent canonical, then copy it as an HTML link tag, an HTTP Link header or a plain URL. Choose your site's rules for www and trailing slashes once, and the tool forces https, drops index.html, strips tracking parameters and fragments, and sorts what's left. Lowercasing the path is there when your site needs it, but off by default — paths are case-sensitive on most servers. Each change is listed, so you can see exactly what happened. The URL is only read as text; it's never visited.",
  usesNote: "One URL per page, every time.",
  useCases: [
    { title: "Kill duplicates", description: "Tracking params, index.html and casing create copies." },
    { title: "Set a site rule", description: "Decide on www and trailing slashes once." },
    { title: "Header or tag", description: "Use the HTTP header for PDFs and other non-HTML files." },
  ],
  faqs: [
    {
      question: "Should canonicals be absolute?",
      answer: "Yes. Always use the full https:// URL.",
    },
    {
      question: "Which params should stay?",
      answer: "Only ones that change the content, like pagination or filters you want indexed.",
    },
    {
      question: "Can a page canonicalise to another site?",
      answer: "Yes, for syndicated content — but it's a strong hint, not a command.",
    },
    {
      question: "Which parameters count as tracking?",
      answer:
        "utm_* campaign tags, click IDs (gclid, gbraid, wbraid, fbclid, msclkid, dclid, yclid, twclid), Mailchimp and HubSpot IDs, plus ref, sessionid and sid. Turn on “Strip all params” if none of your parameters change the content.",
    },
    {
      question: "Is lowercasing the path always safe?",
      answer:
        "Not always. Hostnames are case-insensitive, but paths can be case-sensitive on some servers. So the option is off by default: only switch it on if your site serves the lowercase URL, and check that it loads.",
    },
  ],
  relatedSlugs: ["robots-txt-generator", "hreflang-generator", "sitemap-validator", "meta-preview"],
} as const;

export function CanonicalGeneratorContent() {
  return <ToolContent {...seoData} />;
}
