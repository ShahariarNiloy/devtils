/**
 * JSON-LD generator — pure logic (no React, no DOM).
 *
 * Builds schema.org markup for five types from form values, checks the
 * properties search engines require or recommend, and wraps the result in a
 * <script type="application/ld+json"> block that's safe to paste into HTML.
 */

import { isAbsUrl, type Check, type CheckLevel } from "@/components/tools/seo-shared/seo.lib";

export type LdType = "Article" | "Product" | "Organization" | "FAQPage" | "BreadcrumbList";

export const LD_TYPES: readonly { id: LdType; label: string }[] = [
  { id: "Article", label: "Article" },
  { id: "Product", label: "Product" },
  { id: "Organization", label: "Organization" },
  { id: "FAQPage", label: "FAQ" },
  { id: "BreadcrumbList", label: "Breadcrumbs" },
];

export type Currency = "USD" | "EUR" | "GBP" | "BDT" | "JPY";
export type Availability = "InStock" | "OutOfStock" | "PreOrder";

export const CURRENCIES: readonly { value: Currency; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "BDT", label: "BDT" },
  { value: "JPY", label: "JPY" },
];

export const AVAILABILITY: readonly { value: Availability; label: string }[] = [
  { value: "InStock", label: "In stock" },
  { value: "OutOfStock", label: "Out of stock" },
  { value: "PreOrder", label: "Pre-order" },
];

export interface FaqRow {
  q: string;
  a: string;
}

export interface CrumbRow {
  name: string;
  url: string;
}

export interface LdFields {
  article: { headline: string; image: string; author: string; date: string; publisher: string };
  product: { name: string; image: string; desc: string; price: string; currency: Currency; availability: Availability };
  org: { name: string; url: string; logo: string; sameAs: string };
  faq: FaqRow[];
  crumbs: CrumbRow[];
}

export const SAMPLE_LD: LdFields = {
  article: {
    headline: "How we made utilyx private by default",
    image: "https://utilyx.dev/blog/private.png",
    author: "Ada Lovelace",
    date: "2026-11-20",
    publisher: "utilyx",
  },
  product: {
    name: "utilyx Pro",
    image: "https://utilyx.dev/pro.png",
    desc: "Team workspaces and saved snippets.",
    price: "9.00",
    currency: "USD",
    availability: "InStock",
  },
  org: {
    name: "utilyx",
    url: "https://utilyx.dev",
    logo: "https://utilyx.dev/logo.png",
    sameAs: "https://github.com/utilyx\nhttps://x.com/utilyx",
  },
  faq: [
    { q: "Is utilyx free?", a: "Yes. The core tools are free forever." },
    { q: "Does my data leave my browser?", a: "No. Every tool runs locally." },
  ],
  crumbs: [
    { name: "Home", url: "https://utilyx.dev/" },
    { name: "Tools", url: "https://utilyx.dev/tools" },
    { name: "JSON formatter", url: "" },
  ],
};

/** Empty values for one type, keeping the others. */
export function clearType(f: LdFields, t: LdType): LdFields {
  switch (t) {
    case "Article":
      return { ...f, article: { headline: "", image: "", author: "", date: "", publisher: "" } };
    case "Product":
      return { ...f, product: { name: "", image: "", desc: "", price: "", currency: "USD", availability: "InStock" } };
    case "Organization":
      return { ...f, org: { name: "", url: "", logo: "", sameAs: "" } };
    case "FAQPage":
      return { ...f, faq: [{ q: "", a: "" }] };
    case "BreadcrumbList":
      return { ...f, crumbs: [{ name: "", url: "" }] };
  }
}

/** Sample values for one type, keeping the others. */
export function sampleType(f: LdFields, t: LdType): LdFields {
  switch (t) {
    case "Article":
      return { ...f, article: SAMPLE_LD.article };
    case "Product":
      return { ...f, product: SAMPLE_LD.product };
    case "Organization":
      return { ...f, org: SAMPLE_LD.org };
    case "FAQPage":
      return { ...f, faq: SAMPLE_LD.faq };
    case "BreadcrumbList":
      return { ...f, crumbs: SAMPLE_LD.crumbs };
  }
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json | undefined };

/** ISO 8601 date or date-time with a real month/day. */
function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(s);
  if (!m) return false;
  const [, y, mo, d, hh, mi, ss] = m;
  const days = new Date(Date.UTC(+y, +mo, 0)).getUTCDate();
  return +mo >= 1 && +mo <= 12 && +d >= 1 && +d <= days && (!hh || +hh <= 23) && (!mi || +mi <= 59) && (!ss || +ss <= 59);
}

export interface LdResult {
  checks: Check[];
  /** The JSON object, pretty-printed. */
  json: string;
  /** json wrapped in the script tag (what Copy copies). */
  script: string;
}

export function buildJsonLd(t: LdType, f: LdFields): LdResult {
  const checks: Check[] = [];
  const chk = (level: CheckLevel, text: string) => checks.push({ level, text });
  const obj: { [k: string]: Json | undefined } = { "@context": "https://schema.org", "@type": t };
  const absCheck = (u: string, what: string) => {
    if (u && !isAbsUrl(u)) chk("err", `${what} “${u}” isn't an absolute URL.`);
  };

  if (t === "Article") {
    const a = {
      headline: f.article.headline.trim(),
      image: f.article.image.trim(),
      author: f.article.author.trim(),
      date: f.article.date.trim(),
      publisher: f.article.publisher.trim(),
    };
    obj.headline = a.headline;
    obj.image = a.image ? [a.image] : undefined;
    obj.datePublished = a.date || undefined;
    obj.author = a.author ? { "@type": "Person", name: a.author } : undefined;
    obj.publisher = a.publisher ? { "@type": "Organization", name: a.publisher } : undefined;
    if (!a.headline) chk("err", "headline is required.");
    if (!a.image) chk("warn", "image is recommended for article rich results.");
    absCheck(a.image, "image");
    if (Array.from(a.headline).length > 110) chk("warn", "Headlines over 110 characters may be truncated.");
    if (a.date && !isIsoDate(a.date)) chk("err", "datePublished must be a real ISO 8601 date, like 2026-11-20.");
    if (!a.author) chk("warn", "author is recommended.");
  }

  if (t === "Product") {
    const p = {
      ...f.product,
      name: f.product.name.trim(),
      image: f.product.image.trim(),
      desc: f.product.desc.trim(),
      price: f.product.price.trim(),
    };
    obj.name = p.name;
    obj.image = p.image || undefined;
    obj.description = p.desc || undefined;
    obj.offers = p.price
      ? {
          "@type": "Offer",
          price: p.price,
          priceCurrency: p.currency,
          availability: `https://schema.org/${p.availability}`,
        }
      : undefined;
    if (!p.name) chk("err", "name is required.");
    if (!p.price) chk("warn", "Add offers (price and currency) to be eligible for product rich results.");
    else if (!/^\d+(\.\d+)?$/.test(p.price)) chk("err", "price must be a number like 9.00, without a currency symbol.");
    if (!p.image) chk("warn", "image is recommended.");
    absCheck(p.image, "image");
  }

  if (t === "Organization") {
    const o = { name: f.org.name.trim(), url: f.org.url.trim(), logo: f.org.logo.trim(), sameAs: f.org.sameAs };
    obj.name = o.name;
    obj.url = o.url;
    obj.logo = o.logo || undefined;
    const same = o.sameAs
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (same.length) obj.sameAs = same;
    if (!o.name) chk("err", "name is required.");
    if (!o.url) chk("err", "url is required.");
    absCheck(o.url, "url");
    if (!o.logo) chk("warn", "A logo helps search engines show your brand.");
    absCheck(o.logo, "logo");
    for (const s of same) if (!isAbsUrl(s)) chk("err", `“${s}” isn't an absolute URL.`);
  }

  if (t === "FAQPage") {
    const rows = f.faq.map((r) => ({ q: r.q.trim(), a: r.a.trim() }));
    obj.mainEntity = rows
      .filter((r) => r.q && r.a)
      .map((r) => ({ "@type": "Question", name: r.q, acceptedAnswer: { "@type": "Answer", text: r.a } }));
    if (!rows.some((r) => r.q)) chk("err", "Add at least one question.");
    rows.forEach((r, i) => {
      if (r.q && !r.a) chk("err", `Question ${i + 1} has no answer, so it's left out.`);
      if (!r.q && r.a) chk("warn", `Answer ${i + 1} has no question, so it's left out.`);
    });
    chk(
      "info",
      "FAQ rich results are now limited to well-known government and health sites, but the markup still helps search engines understand the page.",
    );
  }

  if (t === "BreadcrumbList") {
    const rows = f.crumbs.map((r) => ({ name: r.name.trim(), url: r.url.trim() }));
    const named = rows.filter((r) => r.name);
    obj.itemListElement = named.map((r, i) => {
      const it: { [k: string]: Json } = { "@type": "ListItem", position: i + 1, name: r.name };
      if (r.url) it.item = r.url;
      return it;
    });
    if (named.length < 2) chk("warn", "Breadcrumbs need at least two levels.");
    rows.forEach((r, i) => {
      if (!r.name && r.url) chk("warn", `Level ${i + 1} has no name, so it's left out.`);
      if (r.name && i < rows.length - 1 && !r.url) chk("err", `Level ${i + 1} needs a URL. Only the last level may omit it.`);
      if (r.url && !isAbsUrl(r.url)) chk("err", `“${r.url}” isn't absolute.`);
    });
  }

  for (const k of Object.keys(obj)) if (obj[k] === undefined || obj[k] === "") delete obj[k];
  chk("info", "Test the result with a structured-data testing tool before shipping.");
  if (!checks.some((c) => c.level === "err" || c.level === "warn")) chk("ok", `All required properties for ${t} are present.`);

  // "<" is escaped so text like "</script>" can't end the script block early.
  const json = JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
  return { checks, json, script: `<script type="application/ld+json">\n${json}\n</script>` };
}

