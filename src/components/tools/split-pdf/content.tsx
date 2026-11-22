import type { ToolContentProps } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Split a PDF in your browser: pick the pages to keep, save every page as its own file, cut it into ranges like 1-3, 4-6, 7-, or break it every N pages. Each output file is colour-coded on the page grid so you can see exactly what goes where, and several files download together as one ZIP. Pages are copied as they are — text stays selectable, nothing is re-compressed, and nothing is uploaded.",
  usesTitle: "Four ways to split",
  usesNote: "Pick the one that matches the job.",
  useCases: [
    { tag: "Pick pages", tint: "clay", title: "", description: "Pull the signed page out of a contract, or the two pages a form needs, into one new PDF." },
    { tag: "Every page", tint: "teal", title: "", description: "One file per page — for scanned batches where each page is its own document." },
    { tag: "Ranges", tint: "sage", title: "", description: "Type 1-3, 4-9, 10- to cut a report into chapters, or an invoice bundle into invoices." },
    { tag: "Every N pages", tint: "rose", title: "", description: "Fixed-size pieces, like two-page statements printed back to back." },
  ],
  faqs: [
    {
      question: "Is my PDF uploaded?",
      answer: "No. It's read and split in your browser, and the new files are saved straight to your device.",
    },
    {
      question: "Does splitting lower the quality?",
      answer: "No. Pages are copied as they are, with their fonts and images untouched, so text stays selectable and nothing is re-compressed.",
    },
    {
      question: "How do I write ranges?",
      answer:
        "Separate them with commas: 1-3, 5, 8- makes three files — pages 1 to 3, page 5, and page 8 to the end. A range can run backwards (5-3) to reverse the order, and “last” means the final page.",
    },
    {
      question: "Why do I get a ZIP?",
      answer: "When the split makes more than one PDF, they're bundled into one ZIP so your browser downloads a single file. One PDF downloads on its own.",
    },
    {
      question: "What about password-protected PDFs?",
      answer: "They need to be unlocked first. We'll tell you if a file is protected instead of failing quietly.",
    },
  ],
  relatedSlugs: ["merge-pdf", "compress-pdf", "sign-pdf", "image-compressor"],
} satisfies ToolContentProps;
