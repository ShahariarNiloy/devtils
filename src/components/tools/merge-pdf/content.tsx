import type { ToolContentProps } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Combine PDFs into one file in your browser. Add as many files as you like, then reorder, rotate or delete pages before you merge — drag thumbnails, or select several and move them together. Pages are copied as they are, so text stays selectable and images aren't re-compressed. Nothing is uploaded: the files are read and joined on your device, with no size limit and no daily cap.",
  usesTitle: "Why merge here",
  usesNote: "Same result, without the upload.",
  useCases: [
    {
      tag: "Stays on your device",
      tint: "clay",
      title: "",
      description: "Contracts, payslips and ID scans are joined in this tab. Open your browser's network panel — nothing goes out.",
    },
    {
      tag: "No limits",
      tint: "teal",
      title: "",
      description: "No file size cap, no page cap, no “2 tasks per hour”. Your computer does the work, so there's nothing to ration.",
    },
    {
      tag: "Same quality",
      tint: "sage",
      title: "",
      description: "Pages are copied as they are. Text stays selectable and images aren't re-compressed.",
    },
    {
      tag: "More than merge",
      tint: "rose",
      title: "",
      description: "Reorder, rotate and remove pages first — one PDF out, exactly the way you want it.",
    },
  ],
  faqs: [
    {
      question: "Are my files uploaded?",
      answer: "No. The PDFs are read and joined in your browser, and the result is saved straight to your device.",
    },
    {
      question: "Is there a size limit?",
      answer:
        "Not from us. Very large files (hundreds of MB) can run into your browser's memory on phones; on a laptop they're fine.",
    },
    {
      question: "What about password-protected PDFs?",
      answer: "They can't be changed until they're unlocked. We'll tell you which file it is instead of failing quietly.",
    },
    {
      question: "Are bookmarks kept?",
      answer:
        "Page content and web links come across. Bookmarks, links that jump to another page, and fillable form fields may not — fill in or flatten forms before merging if you need them.",
    },
    {
      question: "Can I change the order of whole files?",
      answer:
        "Yes. Switch to “By file” and drag the files into order; each file's pages stay together. “By page” lets you drag single pages anywhere, or select several and move them with the arrows.",
    },
  ],
  relatedSlugs: ["split-pdf", "compress-pdf", "sign-pdf", "image-compressor"],
} satisfies ToolContentProps;
