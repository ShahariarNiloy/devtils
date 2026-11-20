import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Write Markdown on the left and see it rendered on the right as you type, then copy clean, escaped HTML. Headings, emphasis, links, bullet, numbered and task lists, block quotes, fenced code blocks, tables and rules are supported. Everything is parsed in your browser; nothing is uploaded.",
  usesNote: "README previews without pushing a commit.",
  useCases: [
    { title: "READMEs", description: "Check formatting before you push.", tag: "md", tint: "sage" },
    { title: "Release notes", description: "Write once, paste the HTML anywhere.", tag: "html", tint: "clay" },
    { title: "Docs drafts", description: "Headings, lists, quotes and code in one view.", tag: "docs", tint: "teal" },
  ],
  faqs: [
    {
      question: "Which Markdown is supported?",
      answer:
        "Headings (# and underlined), bold, italic, strikethrough, inline code, links and autolinks, images, bullet, numbered and task lists (nested too), block quotes, fenced code blocks, pipe tables with column alignment and horizontal rules. Reference-style links, footnotes and indented code blocks are not supported yet.",
    },
    {
      question: "Is the HTML safe?",
      answer:
        "Yes. Text is escaped, so pasted HTML such as <script> shows up as text instead of running. Links with schemes other than http, https, mailto and tel (javascript:, for example) are dropped, and the preview is built as page elements, never injected as raw HTML.",
    },
    {
      question: "Why don't my images show in the preview?",
      answer:
        "The tool never makes network requests, so images hosted elsewhere appear as a labelled placeholder rather than being fetched. Inline data: images render normally. The copied HTML keeps every <img> tag, so images will load wherever you paste it.",
    },
    {
      question: "Can I export?",
      answer:
        "Copy the HTML with one click, switch to the HTML view to read it with line numbers, or use the ⋯ menu to download a standalone .html page or the original .md file.",
    },
    {
      question: "How is the word count worked out?",
      answer:
        "Words are counted in the rendered text, so Markdown symbols and link URLs aren't included. Reading time assumes 230 words a minute.",
    },
  ],
  relatedSlugs: ["word-counter", "html-entity", "diff-checker", "code-formatter"],
} as const;

export function MarkdownPreviewContent() {
  return <ToolContent {...seoData} />;
}
