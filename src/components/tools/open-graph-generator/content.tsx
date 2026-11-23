import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Write the Open Graph and Twitter card tags a page needs, check them as you type, and see a large share card and a compact link preview side by side. Title and description counters turn amber when text is short and red when it will be cut off. The tool flags a missing or relative image, a missing og:url and malformed handles, then gives you the meta tags to paste into your <head>. The preview loads your real image, crops it the way platforms do, and checks its actual size and shape — or try a local image before you host it.",
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
        "1200 × 630 pixels (1.91:1) works for large cards everywhere; small summary cards use a square of at least 144 × 144. The tool measures your real image and declares its actual size in og:image:width and og:image:height, so platforms can lay out the card before the image loads.",
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
      question: "Does the preview load my image?",
      answer:
        "Yes — your browser loads it straight from where it's hosted, without telling that site which page asked. If it doesn't load (a 404, a login, or a host that blocks other sites), the tool says so. Previewing a local image never uploads it.",
    },
    {
      question: "Which image formats work?",
      answer:
        "PNG and JPG are safe everywhere, and WebP works on most platforms. SVG isn't supported by most of them, so the tool warns you if the image URL ends in .svg.",
    },
  ],
  relatedSlugs: ["seo-checker", "meta-preview", "json-ld-generator", "canonical-generator"],
} as const;

export function OpenGraphGeneratorContent() {
  return <ToolContent {...seoData} />;
}
