import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Write the Open Graph and Twitter card tags a page needs, check them as you type, and see a large share card and a compact link preview side by side. Title and description counters turn amber when text is short and red when it will be cut off. The tool flags a missing or relative image, a missing og:url and malformed handles, then gives you the meta tags to paste into your <head>. Nothing is fetched: the preview uses a placeholder instead of loading your image.",
  usesNote: "Better link previews on every platform.",
  useCases: [
    { title: "Launch pages", description: "Make sure shared links show a title, image and description." },
    { title: "Blog posts", description: "Article type and per-post images." },
    { title: "Fix bad previews", description: "Find the missing tag behind a blank card." },
  ],
  faqs: [
    {
      question: "What image size?",
      answer:
        "1200 × 630 pixels works for large cards everywhere. The generated tags declare that size, so use an image with those dimensions or edit og:image:width and og:image:height after copying. The small summary card uses a square image, so no size is declared for it.",
    },
    {
      question: "Why does my old preview still show?",
      answer: "Platforms cache cards. Refresh them with each platform's sharing debugger.",
    },
    {
      question: "Do I need twitter: tags?",
      answer: "Only twitter:card. Others fall back to the og: tags.",
    },
    {
      question: "Why isn't my real image in the preview?",
      answer:
        "The tool never makes network requests, so it doesn't load the image URL. The preview shows where the image goes and how the title and description will be cut.",
    },
    {
      question: "Which image formats work?",
      answer:
        "PNG and JPG are safe everywhere, and WebP works on most platforms. SVG isn't supported by most of them, so the tool warns you if the image URL ends in .svg.",
    },
  ],
  relatedSlugs: ["meta-preview", "json-ld-generator", "canonical-generator", "hreflang-generator"],
} as const;

export function OpenGraphGeneratorContent() {
  return <ToolContent {...seoData} />;
}
