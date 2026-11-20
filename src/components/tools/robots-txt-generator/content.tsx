import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Build robots.txt rules per user-agent, add your sitemap and an optional crawl-delay, then test any path against the result for Googlebot, Bingbot, AI crawlers or any other bot. Matching follows the robots.txt standard (RFC 9309): * wildcards, $ end anchors, the longest matching path wins and Allow wins a tie. Presets cover the common setups, including opting out of AI training crawlers. Everything runs in your browser.",
  usesNote: "Control crawlers without blocking your own site.",
  useCases: [
    { title: "Block private areas", description: "Keep admin, search and API paths out of crawls." },
    { title: "Manage AI crawlers", description: "Opt out of training crawlers by user-agent." },
    { title: "Test before deploying", description: "See whether a path is allowed for each bot." },
  ],
  faqs: [
    {
      question: "Does Disallow remove a page from search?",
      answer: "No. It stops crawling. Use a noindex tag to keep a page out of results.",
    },
    {
      question: "How are conflicts resolved?",
      answer: "The longest matching path wins. On a tie, Allow wins.",
    },
    {
      question: "Where does the file go?",
      answer: "At the root: https://yourdomain.com/robots.txt.",
    },
    {
      question: "Which group does a bot follow?",
      answer:
        "Only the group that names it. A bot with its own User-agent group ignores the * group entirely, so repeat any shared rules in that group. The tester follows the same logic.",
    },
    {
      question: "Do all crawlers obey robots.txt?",
      answer:
        "Reputable search engines and the major AI crawlers say they do, but it's a request, not access control. Protect private content with authentication, not robots.txt.",
    },
  ],
  relatedSlugs: ["sitemap-validator", "canonical-generator", "hreflang-sitemap", "meta-preview"],
} as const;

export function RobotsTxtGeneratorContent() {
  return <ToolContent {...seoData} />;
}
