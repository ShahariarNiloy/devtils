import type { ToolContentProps } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Make a PDF smaller in your browser. Photos and scans inside are re-encoded and scaled to a sensible size, uncompressed page data is packed, and text and vector drawings are left exactly as they are, so they stay sharp and selectable. Drag the divider on any page to see the difference before you download. Images whose colours could shift, like print-ready CMYK, are never touched, and if the PDF can't get meaningfully smaller you get the original back. Nothing is uploaded.",
  usesTitle: "What gets smaller, and what doesn't",
  usesNote: "Only the parts that can shrink without you noticing.",
  useCases: [
    { tag: "Photos and scans", tint: "clay", title: "", description: "Re-encoded as JPEG and scaled to a size that still prints well. This is where most of the bytes are." },
    { tag: "Page data", tint: "teal", title: "", description: "Text and drawings stored without compression are packed losslessly — same pages, fewer bytes." },
    { tag: "Left alone", tint: "sage", title: "", description: "Text, fonts and vector art stay untouched. CMYK and special-colour images too, so print colours can't shift." },
    { tag: "Honest result", tint: "rose", title: "", description: "You see the real new size. If it isn't smaller, we say so and give you the original." },
  ],
  faqs: [
    {
      question: "Is my PDF uploaded?",
      answer: "No. It's compressed in your browser and saved straight to your device, so contracts and statements never leave it.",
    },
    {
      question: "Which level should I pick?",
      answer:
        "Recommended suits email and sharing. Light keeps photos almost untouched for a smaller saving. Strong makes the smallest file, with softer photos — drag the divider to check the pages you care about before downloading.",
    },
    {
      question: "Why didn't my PDF get much smaller?",
      answer:
        "A PDF that's mostly text is already small: the text itself can't be compressed further without changing it. The big savings come from photos and scans. If there's nothing worth shrinking, you get the original back instead of a worse copy.",
    },
    {
      question: "Will the colours change?",
      answer:
        "No. Images are re-encoded from their exact pixel values in their own colour space, and images in CMYK, Lab or other special colour spaces are skipped entirely, so print colours stay as they were.",
    },
    {
      question: "Is the text still selectable?",
      answer: "Yes. Only images are re-encoded. Text, fonts, links and vector drawings are copied unchanged.",
    },
  ],
  relatedSlugs: ["image-compressor", "merge-pdf", "split-pdf", "sign-pdf"],
} satisfies ToolContentProps;
