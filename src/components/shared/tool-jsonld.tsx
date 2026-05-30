import { safeJsonLd } from "@/lib/safe-json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getToolSeoData } from "@/lib/tool-seo";
import type { Tool } from "@/lib/tools-registry";

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
 * FAQPage and HowTo emission is wired separately by tools that export
 * their SEO data; see `app/tools/[slug]/page.tsx` for the data hand-off.
 */
export function ToolJsonLd({ tool, isLive }: ToolJsonLdProps) {
  if (!isLive) return null;

  const url = `${SITE_URL}/tools/${tool.slug}`;

  const webApp: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    url,
    description: tool.description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Modern browser.",
    isAccessibleForFree: tool.tier === "free",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
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
        item: `${SITE_URL}/tools?cat=${encodeURIComponent(tool.category)}`,
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

  // HowTo schema covers each use case as a discrete how-to entity. This
  // doesn't get rich results in Google directly (HowTo rich results were
  // mostly retired in 2023), but it's still consumed by Bing, Pinterest,
  // and most AI agents to summarise what the tool does.
  const howToJsonLd = seo
    ? seo.useCases.map((u) => ({
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: u.title,
        description: u.description,
        isPartOf: { "@type": "WebApplication", name: tool.name, url },
      }))
    : [];

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
      {howToJsonLd.map((h, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(h) }}
        />
      ))}
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
  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Handcrafted developer utilities — JSON, encoding, text, image, regex, and more. Every tool runs in your browser.",
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/tools?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
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
