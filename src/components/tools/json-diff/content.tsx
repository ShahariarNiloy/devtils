import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Compare two JSON documents as data, not text. Key order and formatting don't count; arrays can be matched by key, compared as sets, or by position; noisy fields like timestamps and request IDs can be ignored; and the result exports as an RFC 6902 JSON Patch that's verified against the changed document before you copy it. Runs entirely in your browser.",
  usesTitle: "What developers use it for",
  usesNote: "Comparing data, not text.",
  useCases: [
    {
      tag: "API",
      tint: "clay",
      title: "Review an API change",
      description: "Paste v1 and v2 responses. Ignore request IDs and timestamps, see what really changed.",
    },
    {
      tag: "test",
      tint: "teal",
      title: "Debug a failing snapshot",
      description: "Find the one field that differs from the expected fixture, with its exact path.",
    },
    {
      tag: "config",
      tint: "sage",
      title: "Check config drift",
      description: "Compare staging and production settings. Reordered keys don't count.",
    },
    {
      tag: "patch",
      tint: "rose",
      title: "Generate a JSON Patch",
      description: "Get RFC 6902 operations that turn one document into the other, checked before you copy them.",
    },
  ],
  faqs: [
    {
      question: "How are arrays compared?",
      answer:
        "Three ways. By key matches records on an identity field like id, so reordering isn't a change. Ignore order treats arrays as sets. Ordered compares by position, for lists where order matters.",
    },
    {
      question: "Can I ignore timestamps and request IDs?",
      answer:
        "Yes. Add a key name like updatedAt to ignore it everywhere, or a path like $.meta.requestId to ignore one spot. Ignored lines stay visible but dimmed.",
    },
    {
      question: "What does “verified” mean on the patch?",
      answer:
        "We apply the generated JSON Patch to the original and compare the result with the changed document. If they match, the patch is marked verified.",
    },
    {
      question: "Does key order or formatting count?",
      answer:
        "No. Both sides are parsed and compared as data. A type change, like \"48.50\" becoming 48.5, is flagged on its own.",
    },
    {
      question: "Is my JSON uploaded?",
      answer: "No. Both documents are compared in your browser.",
    },
  ],
  relatedSlugs: ["json-formatter", "json-schema", "json-to-typescript", "json-to-zod"],
} as const;

export function JsonDiffContent() {
  return <ToolContent {...seoData} />;
}
