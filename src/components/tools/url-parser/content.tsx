import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Paste any URL to see it split into scheme, credentials, host, port, path, segments, query and fragment, colour-coded to match the address. Query parameters are decoded one per row, tracking parameters are flagged, and you can remove any parameter or strip all tracking in one tap. The URL is only read as text; it is never visited.",
  usesNote: "Read long URLs at a glance.",
  useCases: [
    { title: "Debug redirects", description: "See every part of a URL clearly.", tag: "://", tint: "teal" },
    { title: "Strip tracking", description: "Remove utm_ and click IDs in one tap.", tag: "utm_", tint: "clay" },
    { title: "Check parameters", description: "Decoded values, one per row.", tag: "?&=", tint: "sage" },
  ],
  faqs: [
    {
      question: "Which parameters count as tracking?",
      answer:
        "utm_* campaign tags, Google click IDs (gclid, gbraid, wbraid, dclid), fbclid, msclkid, twclid, ttclid, yclid, igshid, Mailchimp IDs (mc_cid, mc_eid) and HubSpot IDs (_hsenc, _hsmi, __hstc, __hssc, __hsfp). Generic names like ref are left alone because many sites use them for real features.",
    },
    {
      question: "Are values decoded?",
      answer: "Yes. %20 and + become spaces in the parameter list, and the path is shown decoded too. The coloured URL above keeps the exact encoding.",
    },
    {
      question: "Does removing a parameter change the rest of the URL?",
      answer:
        "No. Only the parameter you remove is taken out; every other parameter keeps its original order and encoding, so the cleaned URL still works the same way.",
    },
    {
      question: "Does it visit the URL?",
      answer: "No. It only reads the text with your browser's built-in URL parser. Nothing is fetched and nothing is sent anywhere.",
    },
    {
      question: "Why is my URL not accepted?",
      answer:
        "A full URL needs a scheme such as https://. Text like example.com/page is a relative reference, not a complete address, so add the scheme and it will parse.",
    },
  ],
  relatedSlugs: ["url-encoder", "jwt-decoder", "timestamp-converter", "json-formatter"],
} as const;

export function UrlParserContent() {
  return <ToolContent {...seoData} />;
}
