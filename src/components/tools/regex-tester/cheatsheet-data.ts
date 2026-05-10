// Shared regex cheatsheet content + per-token-type styling.
// Imported by both desktop RegexTester and mobile dialogs.

import type { TokenType } from "./regex.lib";

export interface CheatsheetGroup {
  section: string;
  type: TokenType;
  rows: [string, string][];
}

export const CHEATSHEET: CheatsheetGroup[] = [
  {
    section: "Anchors",
    type: "anchor",
    rows: [
      ["^", "Start of string (or line with m flag)"],
      ["$", "End of string (or line with m flag)"],
      ["\\b", "Word boundary"],
      ["\\B", "Non-word boundary"],
    ],
  },
  {
    section: "Character classes",
    type: "char-class",
    rows: [
      [".", "Any character except newline (\\n)"],
      ["\\d", "Digit — [0-9]"],
      ["\\D", "Non-digit — [^0-9]"],
      ["\\w", "Word char — [a-zA-Z0-9_]"],
      ["\\W", "Non-word char — [^a-zA-Z0-9_]"],
      ["\\s", "Whitespace — space, tab, newline…"],
      ["\\S", "Non-whitespace"],
      ["[abc]", "One of: a, b, or c"],
      ["[^abc]", "None of: a, b, or c"],
      ["[a-z]", "Character in range a – z"],
    ],
  },
  {
    section: "Quantifiers",
    type: "quantifier",
    rows: [
      ["*", "0 or more (greedy)"],
      ["+", "1 or more (greedy)"],
      ["?", "0 or 1 (greedy)"],
      ["{n}", "Exactly n times"],
      ["{n,}", "n or more times"],
      ["{n,m}", "Between n and m times"],
      ["*?  +?  ??", "Non-greedy (lazy) variants"],
    ],
  },
  {
    section: "Groups",
    type: "group",
    rows: [
      ["(...)", "Capture group — referenced as $1, $2…"],
      ["(?:...)", "Non-capturing group"],
      ["(?<name>...)", "Named capture group"],
      ["(?=...)", "Positive lookahead"],
      ["(?!...)", "Negative lookahead"],
      ["(?<=...)", "Positive lookbehind"],
      ["(?<!...)", "Negative lookbehind"],
      ["a|b", "Alternation — a or b"],
    ],
  },
  {
    section: "Flags",
    type: "special",
    rows: [
      ["g", "Global — find all matches, not just first"],
      ["i", "Case-insensitive matching"],
      ["m", "Multiline — ^ and $ match line boundaries"],
      ["s", "Dotall — . also matches newline (\\n)"],
      ["u", "Unicode — enables full Unicode support"],
      ["y", "Sticky — match only from lastIndex"],
    ],
  },
  {
    section: "Replacement tokens",
    type: "literal",
    rows: [
      ["$1  $2  …", "Contents of capture group n"],
      ["$<name>", "Contents of named capture group"],
      ["$&", "Entire matched substring"],
      ["$`", "String before the match"],
      ["$'", "String after the match"],
      ["$$", "Literal dollar sign"],
    ],
  },
];

export const TOKEN_STYLE: Record<TokenType, { bg: string; text: string; label: string }> = {
  anchor:       { bg: "bg-[var(--color-token-anchor-bg)]",   text: "text-[var(--color-token-anchor-text)]",   label: "Anchor"     },
  "char-class": { bg: "bg-[var(--color-token-class-bg)]",    text: "text-[var(--color-token-class-text)]",    label: "Class"      },
  group:        { bg: "bg-[var(--color-token-group-bg)]",    text: "text-[var(--color-token-group-text)]",    label: "Group"      },
  "group-end":  { bg: "bg-[var(--color-token-group-bg)]",    text: "text-[var(--color-token-group-text)]",    label: "Group"      },
  quantifier:   { bg: "bg-[var(--color-token-quant-bg)]",    text: "text-[var(--color-token-quant-text)]",    label: "Quantifier" },
  escape:       { bg: "bg-[var(--color-token-class-bg)]",    text: "text-[var(--color-token-class-text)]",    label: "Escape"     },
  special:      { bg: "bg-[var(--color-token-anchor-bg)]",   text: "text-[var(--color-token-anchor-text)]",   label: "Special"    },
  alternation:  { bg: "bg-border-subtle",                    text: "text-text-muted",                         label: "Or"         },
  literal:      { bg: "bg-[var(--color-token-literal-bg)]",  text: "text-[var(--color-token-literal-text)]",  label: "Literal"    },
};
