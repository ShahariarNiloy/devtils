import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Count words, characters (with and without spaces), sentences and paragraphs as you type, with reading time, speaking time and keyword density. Limit bars show at a glance whether your text fits an SEO title, a meta description, a post on X or a LinkedIn post. Your text never leaves the browser.",
  usesNote: "Know if it fits before you paste it.",
  useCases: [
    { title: "Meta descriptions", description: "Stay under 160 characters.", tag: "160", tint: "sage" },
    { title: "Social posts", description: "Check X and LinkedIn limits as you write.", tag: "280", tint: "clay" },
    { title: "Keyword checks", description: "See which words dominate a page.", tag: "%", tint: "teal" },
  ],
  faqs: [
    {
      question: "How is reading time worked out?",
      answer: "At 230 words a minute, a common adult average for silent reading. Speaking time, shown in the status bar, uses 130 words a minute.",
    },
    {
      question: "Which words are ignored for keywords?",
      answer:
        "Words of one or two letters, plain numbers, and common English words like the, and, with, for and that. Density is each keyword's share of all words in the text.",
    },
    {
      question: "Does it count emoji?",
      answer:
        "Yes, as characters. Characters are counted the way you see them, so an emoji with a skin tone or an accented letter counts once, not as several code units.",
    },
    {
      question: "How are words counted in languages without spaces?",
      answer:
        "The counter uses your browser's built-in word segmentation, which splits Chinese, Japanese and Thai text into words using dictionary rules. Counts may differ slightly from a word processor's.",
    },
    {
      question: "Is the X limit exact?",
      answer:
        "It's a plain character count against 280. X itself counts every link as 23 characters and some characters, like CJK and emoji, as two, so treat the bar as a close guide rather than X's exact number.",
    },
  ],
  relatedSlugs: ["markdown-preview", "case-converter", "diff-checker", "regex-tester"],
} as const;

export function WordCounterContent() {
  return <ToolContent {...seoData} />;
}
