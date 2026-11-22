// SEO data for the image compressor (intro, starting points, FAQ). Read by
// the server-side JSON-LD / search index (src/lib/tool-seo.ts), so this
// module stays free of client code; the interactive section that renders
// it lives in components/content-section.tsx.

import { STARTING_POINTS } from "./image-compressor.starts";

export const seoData = {
  intro:
    "Compress images in the browser with real encoders — AVIF, WebP, JPEG and PNG compiled to WebAssembly — and see the real file sizes before you download. Auto keeps the smallest format per image, a size budget finds the highest quality that fits, and a drag-to-reveal comparison with “Show what changed” shows exactly what compression touched. Colour profiles are kept or colour-managed, so reds don't drift.",
  usesTitle: "Pick a starting point",
  usesNote: "What most sites need.",
  useCases: STARTING_POINTS.map((p) => ({ title: p.title, description: p.body, tag: p.chip, tint: p.tint })),
  faqs: [
    {
      question: "What does Auto do?",
      answer:
        "It encodes each image as AVIF, WebP and JPEG at the same quality and keeps the smallest. JPEG is skipped for images with transparency. If the smallest one would drop a wide-gamut colour profile and another format keeps the colours right, the colour-accurate one wins.",
    },
    {
      question: "How does the size budget work?",
      answer:
        "For each image it searches for the highest quality that still fits. If even the lowest quality is too big, the image is flagged so you can pick a smaller width.",
    },
    {
      question: "Are my images uploaded?",
      answer: "No. Your browser does the encoding, so the sizes you see are the real file sizes you'll download.",
    },
    {
      question: "Why did a file stay the same?",
      answer:
        "Some files — small UI screenshots especially — are already compressed well. Rather than hand you a bigger file, the original is kept. Turn off “Never make it bigger” to get the re-encode anyway, with its honest +% size.",
    },
    {
      question: "What do Best, Balanced and Smallest mean?",
      answer:
        "Each is a fixed encoder quality per format, tuned on a public photo set: Best is visually lossless, Balanced looks the same at normal viewing and is much smaller, Smallest trades a little detail for size. Drag the slider for an exact quality instead — every format gets the equivalent setting, so comparisons stay fair.",
    },
    {
      question: "Which format should I pick?",
      answer:
        "By default each image keeps its own format — nothing is converted until you choose. The bars under the preview show an estimate (≈) of every other format's size; click one to convert and get the exact size. AVIF is usually smallest (every current browser shows it); WebP is close behind and encodes faster; JPEG works everywhere but has no transparency; PNG is for sharp-edged graphics and exact pixels. Auto encodes AVIF, WebP and JPEG and keeps the smallest.",
    },
    {
      question: "Why is AVIF slow to encode?",
      answer:
        "AVIF's encoder searches a much larger space than JPEG or WebP to find the best compression — often 5–20× longer. The reward is meaningfully smaller files at the same quality.",
    },
    {
      question: "What happens to colour profiles?",
      answer:
        "Images carry a colour profile (sRGB, Display P3, Adobe RGB) that tells browsers how to show their pixels. Keeping the same format keeps the profile; a format swap converts Display P3 to sRGB so colours stay right, and you're warned if another profile can't be carried. Stripping profiles silently is how reds turn orange.",
    },
    {
      question: "Can I resize as well as compress?",
      answer:
        "Yes — pick a Max width. Wider images are scaled down to it (keeping their aspect ratio) before encoding; narrower ones keep their size, never upscaled.",
    },
  ],
  relatedSlugs: ["image-format-converter", "image-resizer", "image-batch-resizer", "image-color-extractor"],
} as const;
