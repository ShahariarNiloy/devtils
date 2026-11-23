/**
 * /faq content. Shared by the visible list and the FAQPage JSON-LD, so
 * the two can never drift. Keep every answer true to how the site
 * actually works — no offline claims until a service worker ships.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "privacy",
    title: "Privacy and data",
    items: [
      {
        q: "Does my data leave my browser?",
        a: "No — nothing leaves your browser. Every tool works inside the page, so nothing you paste or drop in (JSON, tokens, PDFs, photos) is uploaded, logged or stored on a server. The only request a tool makes is one you ask for, like loading JSON from a URL in the JSON formatter, which your browser fetches directly. The one exception is the SEO checker: to check a live page, it sends the URL (and only the URL) to our server, which fetches that public page for you.",
      },
      {
        q: "Can I paste tokens, keys or customer data?",
        a: "Yes, that's what it's built for. Processing happens locally, so secrets stay on your machine.",
      },
      {
        q: "Do you use analytics?",
        a: "Only cookieless, aggregate page-view counts from Cloudflare Web Analytics. What you type or paste into a tool is never part of them. The privacy policy has the details.",
      },
    ],
  },
  {
    id: "tools",
    title: "Using the tools",
    items: [
      {
        q: "Do I need to install anything?",
        a: "No. Every tool runs in a modern browser. Open the page and start; there's no extension or desktop app to install.",
      },
      {
        q: "Is there a size limit?",
        a: "There's no server-side limit because nothing goes to a server. Your browser's memory is the practical ceiling, so very large inputs may feel slower.",
      },
      {
        q: "How do I find a tool fast?",
        a: "Press ⌘K (Ctrl K on Windows and Linux) anywhere and start typing.",
      },
    ],
  },
  {
    id: "account",
    title: "Account and pricing",
    items: [
      { q: "Is it free?", a: "Yes. Every tool is free to use." },
      { q: "Do I need an account?", a: "No. Open a tool and use it." },
      {
        q: "Can I request a tool?",
        a: "Please do. Tell us what you need through the contact page and we'll take a look.",
      },
    ],
  },
];

/** Case-insensitive match on question + answer. Empty query keeps all. */
export function filterFaq(groups: FaqGroup[], query: string): FaqGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return groups;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(needle)),
    }))
    .filter((g) => g.items.length > 0);
}
