import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Compare two blocks of text side-by-side or as a unified patch. Line-level diff with word-level highlighting inside changed lines, so you see WHICH word changed, not just that the line did. Configurable whitespace and case sensitivity. Pure client-side — pasted text never leaves your browser.",
  usesNote: "Find the difference without squinting.",
  useCases: [
    {
      title: "Reviewing a config change before commit",
      description:
        "Paste the old `.env`, `tsconfig.json`, or YAML on the left and the new one on the right. Confirm only the intended keys changed before you stage the file.",
    },
    {
      title: "Comparing API responses",
      description:
        "Paste two JSON payloads from staging vs production. The word-level highlights pop up exactly which field shifted — easier than scrolling two browser tabs.",
    },
    {
      title: "Sanity-checking a refactor",
      description:
        "Paste a function before and after a rename or extract. The diff confirms the rename hit every site without changing behaviour-bearing characters.",
    },
    {
      title: "Comparing prose for editorial work",
      description:
        "Paste two drafts of copy and surface every word-level change. The unified view doubles as a track-changes summary you can paste into a review thread.",
    },
  ],
  faqs: [
    {
      question: "Does the text I paste leave my browser?",
      answer:
        "No. The diff runs entirely in your browser using a pure JavaScript implementation of the Myers diff algorithm — nothing is sent to a server. Safe for proprietary code, secrets, or sensitive prose.",
    },
    {
      question: "What's the difference between Split and Unified view?",
      answer:
        "Split shows two columns — original on the left, changed on the right — with paired changed lines aligned and the changed words highlighted. Unified shows one column with +/− markers, the way `git diff` renders; it's compact and is the view used on phones. To get an actual patch file, use Copy as patch or Download .patch from the ⋯ menu.",
    },
    {
      question: "How does the word-level highlighting work?",
      answer:
        "When the line diff produces a delete + insert pair (a line that changed rather than was inserted/removed), a second pass diffs the two strings at word granularity. In Split view the result is highlighted inline so you can see exactly which substring shifted.",
    },
    {
      question: "Why are CRLF and LF line endings treated the same?",
      answer:
        "We normalise both inputs to LF before comparing, so paste-from-Windows doesn't produce a phantom diff against paste-from-Unix. If you specifically need to see line-ending differences, that's a planned option.",
    },
    {
      question: "What does Ignore whitespace do?",
      answer:
        "With the toolbar switch on, lines that differ only in spaces or tabs count as equal: every whitespace run collapses to a single space and leading/trailing whitespace is trimmed before comparing. The ⋯ menu has the gentler 'Trailing whitespace' option (on by default — only whitespace at the end of each line is ignored) and 'Letter case'. The text you see is never altered; only the comparison is.",
    },
    {
      question: "Is there a size limit?",
      answer:
        "It's comfortable up to a few thousand lines. Dropped files are capped at 5 MB each, and long unchanged stretches fold into a 'Show N unchanged lines' row so big files stay readable. Very large inputs with many changes can take a moment, because the whole diff runs on your device.",
    },
    {
      question: "Are there keyboard shortcuts?",
      answer:
        "Yes — press `n` to jump to the next change and `p` for the previous one. Press `/` to focus the original input and `e` to hide or show the inputs.",
    },
  ],
  relatedSlugs: ["json-diff", "regex-tester", "case-converter", "json-formatter"],
} as const;

export function DiffCheckerContent() {
  return <ToolContent {...seoData} />;
}
