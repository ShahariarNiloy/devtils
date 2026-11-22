import type { ToolContentProps } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Sign a PDF in your browser. Draw your signature, type your name in a handwriting font, or upload a photo of it — the paper background is removed for you. Place your signature, initials, the date, text or a tick anywhere on any page, drag and resize them, then download. Everything is written into the pages, so it looks the same in every PDF reader, and neither the document nor your signature ever leaves your device.",
  usesTitle: "Sign in three steps",
  usesNote: "No account, no email round-trip.",
  useCases: [
    {
      tag: "1 · Make your signature",
      tint: "clay",
      title: "",
      description: "Draw it, type your name in a handwriting font, or upload a photo — the paper is removed for you.",
    },
    {
      tag: "2 · Place it",
      tint: "teal",
      title: "",
      description: "Pick Signature, Initials, Date or Text and click where it goes. Drag to move, pull the corner to resize.",
    },
    {
      tag: "3 · Download",
      tint: "sage",
      title: "",
      description: "Everything is written into the pages, so it looks the same in every PDF reader.",
    },
    {
      tag: "Your contract stays here",
      tint: "rose",
      title: "",
      description: "Leases, offer letters and NDAs never leave your browser — and neither does your signature.",
    },
  ],
  faqs: [
    {
      question: "Is this legally binding?",
      answer:
        "This is a simple electronic signature. Many countries accept those for everyday agreements, but rules vary and some documents need a certificate-based or handwritten signature. If it matters, check what the other party or your local law requires.",
    },
    {
      question: "Where is my signature saved?",
      answer:
        "Only in this browser, and only if “Remember on this device” is on. It's off until you turn it on; with it off, your signature is gone when you close the tab.",
    },
    {
      question: "The PDF was already signed by someone else",
      answer:
        "If it carries a certificate-based signature, adding yours here will invalidate theirs. We check for that and warn you before you sign.",
    },
    {
      question: "Can I ask someone else to sign?",
      answer: "Not yet. Sign your part, download, and send the file on — they can sign it here the same way.",
    },
    {
      question: "Will it look the same in Acrobat, Preview and my browser?",
      answer:
        "Yes. Signatures, dates and text are drawn into the page itself rather than added as form fields or comments, so every PDF reader shows them the same way and they can't be dragged off by the next person.",
    },
  ],
  relatedSlugs: ["merge-pdf", "split-pdf", "compress-pdf", "password-generator"],
} satisfies ToolContentProps;
