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

// One calm, neutral chip for every token type — the type is conveyed by the
// `label` text, not a rainbow of hues. (Kept as a map so the per-type label
// stays accurate and callers don't change.)
const NEUTRAL = { bg: "bg-surface-soft", text: "text-text-muted" } as const;

export const TOKEN_STYLE: Record<TokenType, { bg: string; text: string; label: string }> = {
  anchor:       { ...NEUTRAL, label: "Anchor"     },
  "char-class": { ...NEUTRAL, label: "Class"      },
  group:        { ...NEUTRAL, label: "Group"      },
  "group-end":  { ...NEUTRAL, label: "Group"      },
  quantifier:   { ...NEUTRAL, label: "Quantifier" },
  escape:       { ...NEUTRAL, label: "Escape"     },
  special:      { ...NEUTRAL, label: "Special"    },
  alternation:  { ...NEUTRAL, label: "Or"         },
  literal:      { ...NEUTRAL, label: "Literal"    },
};
