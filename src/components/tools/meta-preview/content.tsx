import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Type a title tag, meta description and URL and see them laid out as a search result for desktop or mobile. Lengths are measured in pixels with your browser's font engine, not counted in characters, so a title full of W's is flagged long before one full of i's. Text that won't fit is cut the way search results cut it, at a word with an ellipsis, and the tool gives you the title, description and canonical tags to paste. Nothing you type is sent anywhere.",
  usesNote: "Write titles that don't get cut off.",
  useCases: [
    { title: "Avoid truncation", description: "Pixel-width meters, not just character counts." },
    { title: "Desktop and mobile", description: "Check both widths before you publish." },
    { title: "Copy the tags", description: "Title, description and canonical in one block." },
  ],
  faqs: [
    {
      question: "Why pixels, not characters?",
      answer: "Search results cut by width. W and i take very different space.",
    },
    {
      question: "How accurate are the widths?",
      answer:
        "They're estimates. The tool measures with 20px Arial for titles and 14px Arial for descriptions against limits of about 600px and 920px (680px on mobile). Real cut-off points vary by search engine, device and font.",
    },
    {
      question: "Will my description always show?",
      answer: "Not always. Search engines may pick text from the page instead.",
    },
    {
      question: "Ideal lengths?",
      answer: "Roughly 50–60 characters for titles and 120–155 for descriptions.",
    },
    {
      question: "Does it fetch my page?",
      answer: "No. The preview only uses what you type; the URL is read as text.",
    },
  ],
  relatedSlugs: ["open-graph-generator", "json-ld-generator", "canonical-generator", "robots-txt-generator"],
} as const;

export function MetaPreviewContent() {
  return <ToolContent {...seoData} />;
}
