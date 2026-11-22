import type { ToolContentProps } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Turn PDF pages into PNG, JPG or WebP images in your browser. Pick every page, odd or even pages, a range like 1-3, 6, or click the pages you want; choose 72, 150 or 300 DPI; and save one image, separate files, or a single ZIP. PNG and WebP can have a transparent background, the estimate comes from really rendering a page with your settings, and very large pages are capped honestly to what your browser can draw. Nothing is uploaded and there's no page limit.",
  usesTitle: "Which setting to pick",
  usesNote: "Most people want one of these.",
  useCases: [
    {
      tag: "Slides & docs",
      tint: "clay",
      title: "",
      description:
        "PNG at 150 DPI. Text stays crisp in Notion, Slack, Google Slides and Keynote.",
    },
    {
      tag: "Web & email",
      tint: "teal",
      title: "",
      description:
        "WebP or JPG at 72–150 DPI. A fraction of the size, still easy to read.",
    },
    {
      tag: "Printing",
      tint: "sage",
      title: "",
      description:
        "PNG at 300 DPI. Bigger files, but nothing gets blurry on paper.",
    },
    {
      tag: "Logos & diagrams",
      tint: "rose",
      title: "",
      description:
        "PNG with a transparent background, so it sits cleanly on any colour.",
    },
  ],
  faqs: [
    {
      question: "Is my PDF uploaded?",
      answer:
        "No. Pages are drawn by your browser and the images are saved straight to your device.",
    },
    {
      question: "What DPI should I use?",
      answer:
        "150 for screens, 300 for print. Going higher mostly makes files bigger, not sharper.",
    },
    {
      question: "PNG, JPG or WebP?",
      answer:
        "PNG for text, diagrams and anything you'll edit — it's lossless. JPG for pages that are mostly photos. WebP is small and sharp, and works almost everywhere now; Safari can show WebP but can't save it, so it's offered only where your browser can write it.",
    },
    {
      question: "Why is a page smaller than the DPI I picked?",
      answer:
        "Browsers limit how big an image they'll draw — about 16 megapixels on iPhone and iPad. A poster-sized page at 300 DPI goes past that, so we draw it at the most the browser allows and tell you the DPI it got.",
    },
    {
      question: "Can I get the photos out of a PDF instead?",
      answer:
        "This tool saves whole pages. Pulling out the original embedded images is a separate tool we're planning.",
    },
    {
      question: "Password-protected PDFs?",
      answer:
        "Unlock it first. We'll tell you right away instead of producing blank images.",
    },
  ],
  relatedSlugs: [
    "image-to-pdf",
    "split-pdf",
    "compress-pdf",
    "image-compressor",
  ],
} satisfies ToolContentProps;
