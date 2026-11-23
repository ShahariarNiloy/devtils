import type { ToolContentProps } from "@/components/shared/tool-content";

export const seoData = {
  intro:
    "Check any public page the way a search engine sees it. Enter a URL and the SEO checker fetches the page and its robots.txt, then tells you whether it can be indexed — and if not, exactly why: a noindex tag, an X-Robots-Tag header, a robots.txt rule, an error status. You see the page as a Google result and as a share card with its real image, plus checks for the title and description, canonical URL, redirects, Open Graph and X cards, hreflang, JSON-LD structured data, headings, language and image alt text. Each problem links to the utilyx tool that fixes it. For staging or private pages, paste the source instead and nothing leaves your browser.",
  usesTitle: "What it catches",
  usesNote: "The mistakes that quietly cost traffic.",
  useCases: [
    { tag: "Not indexed", tint: "clay", title: "", description: "A leftover noindex, an X-Robots-Tag header or a robots.txt rule that hides the page from search." },
    { tag: "Wrong canonical", tint: "teal", title: "", description: "A canonical that points at another page, is relative, or is declared twice." },
    { tag: "Bad share cards", tint: "sage", title: "", description: "Missing og:image, an image that 404s, or one that's too small or the wrong shape." },
    { tag: "Broken data", tint: "rose", title: "", description: "JSON-LD that doesn't parse, so search engines ignore it — and the rich result never shows." },
  ],
  faqs: [
    {
      question: "Is the page I check sent to your server?",
      answer:
        "The URL is. A browser can't read another site's HTML (CORS blocks it), so our server fetches the public page for you, like a search engine would — plus its robots.txt and the headers of its share image and favicon — and sends back what it got. Only the URL is sent; nothing is stored or logged. To check a page without that, use Paste source — it runs entirely in your browser.",
    },
    {
      question: "Can it check pages behind a login or on my local network?",
      answer:
        "No. The fetcher only reaches public pages on the standard web ports and refuses private and internal addresses. For staging, localhost or logged-in pages, open View Source, copy it, and use Paste source.",
    },
    {
      question: "Why does it say my page isn't indexable?",
      answer:
        "Because something tells search engines to stay away: a noindex robots meta tag, an X-Robots-Tag: noindex response header, a robots.txt rule that blocks Googlebot from the path, or an error status. The banner names each one; fixing all of them is required.",
    },
    {
      question: "Why check the images from the server too?",
      answer:
        "Your browser can show an image but can't see what crawlers see: its real file size, its content type, or whether robots.txt blocks the crawler that fetches it. The checker asks the server for just the headers, then flags share images over 5 MB (X won't show them), \"images\" that are really error pages, and favicons Google's image crawler isn't allowed to fetch.",
    },
    {
      question: "Does it run JavaScript?",
      answer:
        "No. It reads the HTML the server sends, the way crawlers read it first. If your title, canonical or meta tags only appear after JavaScript runs, the checker will report them missing — and some crawlers will miss them too.",
    },
    {
      question: "How accurate is the Google preview?",
      answer:
        "Titles and descriptions are measured in pixels with the fonts Google uses and cut where Google cuts them. Google can still rewrite either one, so treat it as what your page asks for, not a guarantee.",
    },
  ],
  relatedSlugs: ["meta-preview", "open-graph-generator", "canonical-generator", "robots-txt-generator"],
} satisfies ToolContentProps;
