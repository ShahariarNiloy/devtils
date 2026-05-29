import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Compare two blocks of text side-by-side or as a unified patch. Line-level diff with word-level highlighting inside changed lines, so you see WHICH word changed, not just that the line did. Configurable whitespace and case sensitivity. Pure client-side — pasted text never leaves your browser.",
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
      question: "What's the difference between 'side-by-side' and 'unified' view?",
      answer:
        "Side-by-side shows two columns — original on the left, changed on the right — with paired changed lines aligned. Unified view shows one column with +/− markers, the way `git diff` renders. Side-by-side is better for word-level comparison; unified is better for copy-pasting a patch.",
    },
    {
      question: "How does the word-level highlighting work?",
      answer:
        "When the line diff produces a delete + insert pair (a line that changed rather than was inserted/removed), a second pass diffs the two strings at word granularity. The result is highlighted inline so you can see exactly which substring shifted.",
    },
    {
      question: "Why are CRLF and LF line endings treated the same?",
      answer:
        "We normalise both inputs to LF before comparing, so paste-from-Windows doesn't produce a phantom diff against paste-from-Unix. If you specifically need to see line-ending differences, that's a planned option.",
    },
    {
      question: "What does 'ignore trailing whitespace' actually ignore?",
      answer:
        "Only whitespace at the end of each line is stripped before comparing. Leading indentation and internal spacing are preserved — a real change inside the line still surfaces. 'Ignore all whitespace' is the stronger option that collapses any whitespace run to a single space.",
    },
    {
      question: "Are there keyboard shortcuts?",
      answer:
        "Yes — press `n` to jump to the next hunk and `p` for the previous. Press `/` to focus the original input.",
    },
  ],
  relatedSlugs: ["json-formatter", "case-converter", "regex-tester", "code-beautifier"],
} as const;

export function DiffCheckerContent() {
  return <ToolContent {...seoData} />;
}
