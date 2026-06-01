import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Semantic JSON diff — compares parsed values rather than text, so reformatting and key reorderings don't show up as differences. Detects array moves, flags type changes as warnings, supports identity-keyed array compare for API responses, and exports the result as an RFC 6902 JSON Patch. Runs entirely in your browser — pasted JSON never leaves the tab.",
  useCases: [
    {
      title: "Reviewing API response changes between environments",
      description:
        "Paste staging on the left, production on the right. Identity-keyed mode (by `id`) matches items across reordered arrays so you only see what actually changed, not 'everything moved'. Copy the JSON Patch to share the delta in a PR comment.",
    },
    {
      title: "Auditing config or schema changes in a PR",
      description:
        "Drop the before / after JSON in. Type changes (number → string, etc.) get a warning banner since they're almost always bugs. The side-by-side view canonicalizes keys so reformatting doesn't pollute the diff.",
    },
    {
      title: "Verifying a JSON Patch round-trips correctly",
      description:
        "Diff two JSON documents, copy the RFC 6902 patch, apply it on your server, and verify the result matches. Each op shows up tagged (add / remove / replace / move) so you can scan the patch shape at a glance.",
    },
    {
      title: "Comparing test fixtures that drift over time",
      description:
        "Sort-keys toggle equates objects regardless of key order. Set-like array mode handles tag arrays where order doesn't matter. Identity-keyed mode handles arrays of records where order is incidental.",
    },
  ],
  faqs: [
    {
      question: "What does 'semantic diff' mean here?",
      answer:
        "We parse both inputs as JSON and compare the resulting values structurally. So `{\"a\":1,\"b\":2}` and `{\"b\":2,\"a\":1}` are equal — key order doesn't matter, per the JSON spec. Whitespace, indentation, and trailing commas don't affect the diff either. If you want the literal text diff, switch to the Side-by-side tab.",
    },
    {
      question: "What's the difference between the three array compare modes?",
      answer:
        "**Ordered** treats position as meaningful and uses Longest Common Subsequence to detect moves — reordering reads as 'moved from [0] to [2]' rather than 'removed + added'. **Set-like** ignores order entirely; same elements in any order means no diff. **By id** matches items across the two arrays by an identity key you specify (typically `id`), so nested field changes surface even when the array was reordered. Pick the mode that matches what the data actually represents.",
    },
    {
      question: "Why are type changes called out separately?",
      answer:
        "A field going from a number to a string (`42` → `\"42\"`) is almost always a bug — JSON serialization mismatches between client and server, accidental coercion, a schema drift you didn't intend. They render in warning color with a banner at the top of the controls so they don't get lost in the noise of normal value changes.",
    },
    {
      question: "What is JSON Patch (RFC 6902)?",
      answer:
        "A JSON-based format for describing changes to a JSON document. Each operation is `add`, `remove`, `replace`, or `move` with a path. Applied to the left value, the patch produces the right value. It's the standard way to send incremental changes over an API (PATCH requests) and to express edits in a portable way. We generate the patch automatically from the diff result — copy it and apply it server-side.",
    },
    {
      question: "How does 'sort keys' work?",
      answer:
        "Toggle it on to canonicalize both sides — recursively sort all object keys alphabetically before comparing. The semantic diff result is already key-order-insensitive, so this mostly affects the Side-by-side view, which would otherwise show key-order differences as noisy line moves. Array element order is NOT touched — only object keys.",
    },
    {
      question: "How does identity-keyed mode handle missing keys?",
      answer:
        "If any element on either side is missing the configured identity key, identity-keyed mode silently falls back to ordered (positional) compare for that array. Safer than misreporting matches when the identity is unreliable. Check the input to make sure every object has the key when you want this mode to apply.",
    },
    {
      question: "Does my JSON leave the browser?",
      answer:
        "No. The parse, the diff algorithm, and JSON Patch generation all run locally in your browser. Safe for proprietary schemas, internal API responses, or anything you wouldn't paste into a public tool.",
    },
    {
      question: "What's the largest input the tool can handle?",
      answer:
        "Inputs up to several megabytes work fine. For arrays larger than 1000 items, move-detection (the O(N²) LCS step) falls back to positional comparison to keep the tab responsive. Everything else is linear in input size.",
    },
  ],
  relatedSlugs: [
    "json-formatter",
    "json-schema",
    "diff-checker",
    "json-to-typescript",
  ],
} as const;

export function JsonDiffContent() {
  return <ToolContent {...seoData} />;
}
