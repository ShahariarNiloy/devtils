import { ToolContent } from "@/components/shared/tool-content";

export function RegexTesterContent() {
  return (
    <ToolContent
      intro="Build and test regular expressions with live match highlighting, capture group inspection, and replacement preview. Supports JavaScript regex syntax with all standard flags (g, i, m, s, u, y), shows you exactly which characters matched which group, and warns about common gotchas like catastrophic backtracking patterns."
      useCases={[
        {
          title: "Extracting structured data from logs",
          description:
            "Iterate on a pattern against a real log line until the captures land on what you want, then copy the regex literal into your codebase.",
        },
        {
          title: "Validating user input",
          description:
            "Build a regex for email / phone / postal codes against a representative test set. Catches the false positives a unit test wouldn't reveal until production.",
        },
        {
          title: "Mass-renaming via search-and-replace",
          description:
            "Compose a find pattern + replacement template, see the preview applied to your input before committing the change in your editor.",
        },
        {
          title: "Learning regex syntax",
          description:
            "Each test case shows what matched, what didn't, and which group captured what. Faster feedback than reading the docs.",
        },
      ]}
      faqs={[
        {
          question: "Which regex flavour does this use?",
          answer:
            "JavaScript regex (RegExp). Some features differ from PCRE / Python / Go — notably, JavaScript regex lacks possessive quantifiers and has limited lookbehind support in older engines. Modern V8 (Chrome / Node) supports everything documented at MDN.",
        },
        {
          question: "What's the `s` flag for?",
          answer:
            "`dotAll` mode: makes `.` match newline characters too. Without `s`, `.` excludes `\\n` and `\\r`. Useful when you want to match across multiple lines as a single sequence.",
        },
        {
          question: "Why does my regex tester run forever?",
          answer:
            "Catastrophic backtracking. Patterns like `(a+)+` against a long string of `a`s explode exponentially. The tester aborts after a timeout to keep the UI responsive — try restructuring the pattern with possessive-like constructs or atomic groups.",
        },
        {
          question: "How do named capture groups work?",
          answer:
            "Use `(?<name>...)` to name a group. The match panel shows captures by name in addition to numbered groups, and replacement strings can reference them with `$<name>`.",
        },
        {
          question: "Can I copy the pattern as a string literal?",
          answer:
            "Yes — alongside the live `/pattern/flags` literal there's a copy-as-string option that produces the right escaping for `new RegExp(\"...\")` constructors.",
        },
        {
          question: "Does it handle Unicode?",
          answer:
            "With the `u` flag, yes. Unicode property escapes like `\\p{Letter}` work, and surrogate pairs are treated as single characters. Without `u` you get JavaScript's legacy UTF-16 behaviour.",
        },
      ]}
      relatedSlugs={["case-converter", "json-formatter", "url-encoder", "base64"]}
    />
  );
}
