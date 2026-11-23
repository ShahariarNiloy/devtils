/**
 * Open Graph generator — pure logic (no React, no DOM).
 *
 * Turns the form into og: / twitter: meta tags, checks what a share card
 * needs, and prepares the text for the preview cards. The image itself is
 * loaded by the preview (a request the user asked for, straight from their
 * browser to the image's host); its measured size comes back in as `probe`.
 */

import { escapeXml, isAbsUrl, type Check, type CheckLevel } from "@/components/tools/seo-shared/seo.lib";

export type OgType = "website" | "article" | "product" | "profile";
export type OgCard = "summary_large_image" | "summary";

export interface OgFields {
  title: string;
  desc: string;
  url: string;
  image: string;
  /** Describes the image for screen readers and X. */
  alt: string;
  site: string;
  type: OgType;
  card: OgCard;
  handle: string;
}

/** What loading the image in the browser found. */
export type ImageProbe = { state: "loading" } | { state: "ok"; w: number; h: number } | { state: "error" };

/** Large cards are cropped to 1.91:1, small ones to a square. */
export const LARGE_RATIO = 1.91;

export const SAMPLE_OG: OgFields = {
  title: "utilyx — every tool you need, none you don't",
  desc: "Merge PDFs, compress images, format JSON, decode JWTs and more. Free, no sign-up — nothing leaves your browser.",
  url: "https://www.utilyx.dev/",
  image: "https://www.utilyx.dev/og/default.png",
  alt: "utilyx — every tool you need, none you don't",
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
  alt: "",
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
  preview: { domain: string; title: string; titleShort: string; desc: string; imgLabel: string; large: boolean };
}

/** Size and shape checks for a loaded image, per card type. */
export function imageChecks(probe: ImageProbe, large: boolean): Check[] {
  if (probe.state === "loading") return [];
  if (probe.state === "error") {
    return [
      {
        level: "err",
        text: "The image didn't load in your browser. Check it's public (no login), not a 404, and that the host allows other sites to show it.",
      },
    ];
  }
  const { w, h } = probe;
  const out: Check[] = [];
  const ratio = w / h;
  if (large) {
    if (w < 600 || h < 315) out.push({ level: "err", text: `The image is ${w} × ${h}. Below 600 × 315, most platforms fall back to a small card or no image.` });
    else if (w < 1200) out.push({ level: "warn", text: `The image is ${w} × ${h}. 1200 × 630 looks sharp on high-resolution screens.` });
    if (Math.abs(ratio - LARGE_RATIO) / LARGE_RATIO > 0.05) out.push({ level: "warn", text: `The image is ${ratio.toFixed(2)}:1, so platforms crop it to 1.91:1 — the preview shows what survives.` });
  } else {
    if (w < 144 || h < 144) out.push({ level: "err", text: `The image is ${w} × ${h}. Small cards need at least 144 × 144.` });
    if (Math.abs(ratio - 1) > 0.05) out.push({ level: "warn", text: "Small cards crop the image to a square — the preview shows what survives." });
  }
  if (!out.length) out.push({ level: "ok", text: `Image is ${w} × ${h} — right size and shape.` });
  return out;
}

export function buildOg(f: OgFields, probe: ImageProbe | null = null): OgResult {
  const checks: Check[] = [];
  const chk = (level: CheckLevel, text: string) => checks.push({ level, text });
  const title = f.title.trim();
  const desc = f.desc.trim();
  const url = f.url.trim();
  const image = f.image.trim();
  const site = f.site.trim();
  const alt = f.alt.trim();
  const handle = f.handle.trim();
  const large = f.card === "summary_large_image";
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
    if (probe) checks.push(...imageChecks(probe, large));
    if (!alt) chk("warn", "Add alt text for the image — X and screen readers use it.");
  }
  if (url && !isAbsUrl(url)) chk("err", "og:url must be absolute.");
  if (!url) chk("warn", "Add og:url so shares point at the canonical address.");
  if (handle && !/^@\w{1,15}$/.test(handle)) chk("warn", "Handles look like @name, up to 15 characters.");
  chk("info", "Platforms cache previews. After changing tags, refresh them with each platform's sharing debugger.");
  if (!checks.some((c) => c.level === "err" || c.level === "warn")) chk("ok", "Everything a share card needs is here.");

  // Declare the size only once it's been measured — a wrong size is worse
  // than none, since platforms use it to lay out the card before loading.
  const measured = probe?.state === "ok" ? probe : null;
  const prop: [string, string][] = [
    ["og:title", title],
    ["og:description", desc],
    ["og:url", url],
    ["og:image", image],
    ["og:image:width", image && measured ? String(measured.w) : ""],
    ["og:image:height", image && measured ? String(measured.h) : ""],
    ["og:image:alt", image ? alt : ""],
    ["og:site_name", site],
    ["og:type", f.type],
  ];
  const named: [string, string][] = [
    ["twitter:card", f.card],
    ["twitter:site", handle],
    ["twitter:image:alt", image ? alt : ""],
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
      imgLabel: measured ? `og:image · ${measured.w}×${measured.h}` : "No image set",
      large,
    },
  };
}
