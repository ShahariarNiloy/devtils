/**
 * Open Graph generator — pure logic (no React, no DOM).
 *
 * Turns the form into og: / twitter: meta tags, checks what a share card
 * needs, and prepares the text for the preview cards. The image URL is only
 * read as text; it's never fetched.
 */

import { escapeXml, isAbsUrl, type Check, type CheckLevel } from "@/components/tools/seo-shared/seo.lib";

export type OgType = "website" | "article" | "product" | "profile";
export type OgCard = "summary_large_image" | "summary";

export interface OgFields {
  title: string;
  desc: string;
  url: string;
  image: string;
  site: string;
  type: OgType;
  card: OgCard;
  handle: string;
}

export const SAMPLE_OG: OgFields = {
  title: "utilyx — every dev tool you need, none you don't",
  desc: "Format JSON, test regex, decode JWTs and more. Free, private and fast — everything runs in your browser.",
  url: "https://utilyx.dev/",
  image: "https://utilyx.dev/og.png",
  site: "utilyx",
  type: "website",
  card: "summary_large_image",
  handle: "@utilyx",
};

export const EMPTY_OG: OgFields = {
  title: "",
  desc: "",
  url: "",
  image: "",
  site: "",
  type: "website",
  card: "summary_large_image",
  handle: "",
};

export const OG_TYPES: readonly { value: OgType; label: string }[] = [
  { value: "website", label: "website" },
  { value: "article", label: "article" },
  { value: "product", label: "product" },
  { value: "profile", label: "profile" },
];

export const OG_CARDS: readonly { value: OgCard; label: string }[] = [
  { value: "summary_large_image", label: "summary_large_image — big image" },
  { value: "summary", label: "summary — small square image" },
];

export const TITLE_MAX = 60;
export const TITLE_IDEAL = 30;
export const DESC_MAX = 160;
export const DESC_IDEAL = 70;

export type Tone = "faint" | "ok" | "warn" | "err";

/** Counter colour: grey when empty, red over max, green past ideal, amber when short. */
export function counterTone(n: number, max: number, ideal: number): Tone {
  if (n === 0) return "faint";
  if (n > max) return "err";
  if (n >= ideal) return "ok";
  return "warn";
}

/** Character count in code points, so emoji count once. */
export const charCount = (s: string) => Array.from(s).length;

function truncate(s: string, over: number, keep: number): string {
  const chars = Array.from(s);
  return chars.length > over ? `${chars.slice(0, keep).join("").trimEnd()}…` : s;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export interface OgResult {
  checks: Check[];
  /** The tags, one per line, ready for <head>. */
  html: string;
  preview: { domain: string; title: string; titleShort: string; desc: string; imgLabel: string };
}

export function buildOg(f: OgFields): OgResult {
  const checks: Check[] = [];
  const chk = (level: CheckLevel, text: string) => checks.push({ level, text });
  const title = f.title.trim();
  const desc = f.desc.trim();
  const url = f.url.trim();
  const image = f.image.trim();
  const site = f.site.trim();
  const handle = f.handle.trim();
  const tLen = charCount(title);
  const dLen = charCount(desc);

  if (!title) chk("err", "Add a title.");
  else if (tLen > TITLE_MAX) chk("warn", `Title is ${tLen} characters; most cards cut off around ${TITLE_MAX}.`);
  if (!desc) chk("warn", "Add a description — it's what makes people click.");
  else if (dLen > DESC_MAX) chk("warn", "Description is long; it'll be truncated.");
  if (!image) chk("err", "No image. Links without an image get far fewer clicks.");
  else if (!isAbsUrl(image)) chk("err", "The image must be an absolute URL — crawlers can't resolve relative paths.");
  else {
    if (/^http:/i.test(image)) chk("warn", "The image uses http. Some platforms only load https images.");
    if (/\.svg(?:[?#]|$)/i.test(image)) chk("warn", "SVG share images aren't supported by most platforms. Use PNG or JPG.");
  }
  if (url && !isAbsUrl(url)) chk("err", "og:url must be absolute.");
  if (!url) chk("warn", "Add og:url so shares point at the canonical address.");
  if (handle && !/^@\w{1,15}$/.test(handle)) chk("warn", "Handles look like @name, up to 15 characters.");
  chk("info", "Platforms cache previews. After changing tags, refresh them with each platform's sharing debugger.");
  if (!checks.some((c) => c.level === "err" || c.level === "warn")) chk("ok", "Everything a share card needs is here.");

  const prop: [string, string][] = [
    ["og:title", title],
    ["og:description", desc],
    ["og:url", url],
    ["og:image", image],
    ["og:image:width", image ? "1200" : ""],
    ["og:image:height", image ? "630" : ""],
    ["og:site_name", site],
    ["og:type", f.type],
  ];
  const named: [string, string][] = [
    ["twitter:card", f.card],
    ["twitter:site", handle],
  ];
  const html = [
    ...prop.filter(([, v]) => v).map(([k, v]) => `<meta property="${k}" content="${escapeXml(v)}" />`),
    ...named.filter(([, v]) => v).map(([k, v]) => `<meta name="${k}" content="${escapeXml(v)}" />`),
  ].join("\n");

  const shownTitle = title || "Add a title";
  return {
    checks,
    html,
    preview: {
      domain: hostOf(url) ?? "example.com",
      title: shownTitle,
      titleShort: truncate(shownTitle, 52, 50),
      desc: desc ? truncate(desc, 120, 118) : "Add a description",
      imgLabel: image ? "og:image · 1200×630" : "No image set",
    },
  };
}
