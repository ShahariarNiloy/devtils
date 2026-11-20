import { ToolContent } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Fill in a short form and get schema.org structured data for an Article, Product, Organization, FAQ page or breadcrumb trail, wrapped in a ready-to-paste script tag. As you type, the generator checks the properties search engines require or recommend: a headline or name, absolute image and profile URLs, ISO 8601 dates, a numeric price, answers for every question and a URL for every breadcrumb level except the last. Text is escaped so it can't break out of the script tag. Everything runs in your browser.",
  usesNote: "Help search engines understand your pages.",
  useCases: [
    { title: "Rich results", description: "Products with prices, articles with dates and authors." },
    { title: "Brand details", description: "Organization markup with logo and profiles." },
    { title: "Navigation", description: "Breadcrumbs that match your site structure." },
  ],
  faqs: [
    {
      question: "Where does the script go?",
      answer: "Anywhere in the HTML, usually the head.",
    },
    {
      question: "Does markup guarantee rich results?",
      answer: "No. It makes pages eligible; search engines decide.",
    },
    {
      question: "Can I add several types?",
      answer:
        "Yes. Use one script per type, or combine them in an @graph. This tool builds one type at a time, so paste one script tag for each.",
    },
    {
      question: "Does the markup have to match the page?",
      answer:
        "Yes. Structured data must describe content visitors can see on the page. Markup for prices, questions or reviews that aren't shown can be ignored or count against the page.",
    },
    {
      question: "Why are some characters written as \\u003c?",
      answer:
        "The < character is escaped in the JSON so text like </script> can't end the script block early. JSON parsers read \\u003c as <, so the data is unchanged.",
    },
  ],
  relatedSlugs: ["meta-preview", "open-graph-generator", "sitemap-validator", "canonical-generator"],
} as const;

export function JsonLdGeneratorContent() {
  return <ToolContent {...seoData} />;
}
