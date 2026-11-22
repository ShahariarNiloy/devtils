import { ogImagePath } from "@/lib/og/url";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { categoryAnchor } from "@/lib/tools/category-url";
import { META_DESCRIPTIONS } from "@/lib/tools/meta-descriptions";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getToolSeoData } from "@/lib/tool-seo";
import type { Tool } from "@/lib/tools-registry";

/** One Organization node referenced by @id from every page's publisher. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
/** Self-contained on every page (name + url), and linked to the home page node by @id. */
const PUBLISHER = { "@type": "Organization", "@id": ORG_ID, name: SITE_NAME, url: SITE_URL };

interface ToolJsonLdProps {
  tool: Tool;
  /** True when the tool is wired in `implemented-tools.ts`. */
  isLive: boolean;
}

/**
 * Server-rendered JSON-LD for a single tool route. Emits:
 *
 *   - WebApplication / SoftwareApplication (the tool itself)
 *   - BreadcrumbList (Tools → Category → Tool)
 *
 * Coming-soon tools render nothing — there's no application yet, and
 * advertising one to crawlers would be a misrepresentation.
 *
 * FAQPage comes from the tool's `seoData` (same text as the visible FAQ).
 * No HowTo: the use cases are a title and a sentence, not steps, so they'd
 * be invalid HowTo — and Google retired HowTo results in 2023.
 */
export function ToolJsonLd({ tool, isLive }: ToolJsonLdProps) {
  if (!isLive) return null;

  const url = `${SITE_URL}/tools/${tool.slug}`;

  const webApp: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    url,
    description: META_DESCRIPTIONS[tool.slug] ?? tool.description,
    image: `${SITE_URL}${ogImagePath(tool.slug)}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Modern browser.",
    isAccessibleForFree: tool.tier === "free",
    inLanguage: "en",
    publisher: PUBLISHER,
    isPartOf: { "@id": WEBSITE_ID },
  };

  if (tool.tier === "free") {
    webApp.offers = {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    };
  }

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Tools",
        item: `${SITE_URL}/tools`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: tool.category,
        item: `${SITE_URL}${categoryAnchor(tool.category)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: tool.name,
        item: url,
      },
    ],
  };

  const seo = getToolSeoData(tool.slug);

  // FAQPage rich result — eligible for the expandable FAQ snippet in
  // Google SERPs. Sourced from the same `seoData` const the tool's
  // content.tsx renders, so the JSON-LD is always in lockstep with the
  // visible text.
  const faqJsonLd = seo
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: seo.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}
    </>
  );
}

interface HomepageJsonLdProps {
  /** FAQ entries to emit as a `FAQPage` schema alongside `WebSite`. */
  faqs?: readonly { q: string; a: string }[];
}

/**
 * Homepage JSON-LD. Emits the `WebSite` entity (with SearchAction for the
 * sitelinks search box) plus an optional `FAQPage` mapped from the visible
 * homepage FAQ. Rendered ONLY on `/` — `WebSite` represents the site as
 * a whole and shouldn't appear on every page; other routes get their own
 * page-specific schemas (`WebApplication` on tools, etc.).
 */
export function HomepageJsonLd({ faqs }: HomepageJsonLdProps = {}) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
  };
  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Developer tools that run in your browser — JSON, regex, JWTs, images, encoding, SEO and more. Free, keyboard-first, no sign-up.",
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/tools?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: PUBLISHER,
  };

  const faqPage =
    faqs && faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.a,
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webSite) }}
      />
      {faqPage && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqPage) }}
        />
      )}
    </>
  );
}

/**
 * Collection pages (/tools, /tools/category, a category): CollectionPage
 * whose main entity is an ItemList of what the page lists, plus the page's
 * breadcrumb trail.
 */
export function CollectionJsonLd({
  name,
  path,
  description,
  items,
  breadcrumbs,
}: {
  name: string;
  path: string;
  description: string;
  items: { name: string; path: string }[];
  breadcrumbs: { name: string; path: string }[];
}) {
  const url = `${SITE_URL}${path}`;
  const page = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    description,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: PUBLISHER,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: `${SITE_URL}${it.path}`,
      })),
    },
  };
  const trail = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: `${SITE_URL}${b.path}`,
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(page) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(trail) }}
      />
    </>
  );
}
