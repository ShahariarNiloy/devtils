import type { ToolContentProps } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Turn photos, scans and screenshots into one PDF in your browser. Drop in JPG, PNG, WebP, GIF or iPhone HEIC files — or paste a screenshot — drag them into order, rotate any that came in sideways, and pick A4, Letter or pages the shape of each image. JPEGs go in untouched when they're already small enough, screenshots stay pixel-sharp, and colour profiles travel with every image, so nothing shifts colour. Nothing is uploaded, there's no watermark and no limit on how many images.",
  usesTitle: "Good for",
  usesNote: "The everyday reasons people need this.",
  useCases: [
    {
      tag: "Receipts & expenses",
      tint: "clay",
      title: "",
      description:
        "Phone photos of receipts into one PDF for your expense report.",
    },
    {
      tag: "Applications",
      tint: "teal",
      title: "",
      description:
        "Certificates and documents as a single file — and they never touch a server.",
    },
    {
      tag: "Bug reports",
      tint: "sage",
      title: "",
      description:
        "A run of screenshots, in order, as one attachment for the ticket. Paste them straight in.",
    },
    {
      tag: "Notes & whiteboards",
      tint: "rose",
      title: "",
      description: "Meeting whiteboards and handwritten pages, ready to share.",
    },
  ],
  faqs: [
    {
      question: "Are my images uploaded?",
      answer:
        "No. The PDF is put together in your browser and saved straight to your device.",
    },
    {
      question: "Why is my PDF so big?",
      answer:
        "Phone photos are large. Pick Balanced or Small under File size — the estimate updates as you switch, and the real size shows when you save.",
    },
    {
      question: "Can I use iPhone HEIC photos?",
      answer:
        "Yes, in any browser. Safari reads them natively; elsewhere a decoder loads the first time you add one. Their colour profile is kept, so Display P3 photos don't come out dull.",
    },
    {
      question: "Will my images lose quality?",
      answer:
        "Not with Original: JPEGs go in byte for byte and everything else is stored losslessly. Balanced and Small re-save photos as JPEG, but screenshots and diagrams always stay lossless so text stays sharp.",
    },
    {
      question: "Why did my sideways photo come out upright?",
      answer:
        "Phones store which way up a photo was taken, and PDF viewers ignore that. We apply it for you — then use rotate on any page you still want turned.",
    },
    {
      question: "Is the text searchable?",
      answer:
        "No — each page is a picture. Text recognition (OCR) is on our list as a separate tool.",
    },
  ],
  relatedSlugs: [
    "merge-pdf",
    "pdf-to-image",
    "compress-pdf",
    "image-compressor",
  ],
} satisfies ToolContentProps;
