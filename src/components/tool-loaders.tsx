"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LiveSlug } from "@/lib/tools/live";
import type { Tool } from "@/lib/tools/types";

type ToolComponent = ComponentType<{ tool: Tool }>;

/*
 * One code-split chunk per tool. A server component can't code-split the
 * client components it imports (Next docs: lazy-loading), so the switch
 * lives here, in a client component. Pages are still server-rendered — only
 * the JavaScript is split, so /tools/json-formatter no longer downloads
 * Prettier, the SQL formatter, Ajv, etc. for tools that aren't on the page.
 *
 * Typed `Record<LiveSlug, …>`: adding a slug to live.ts without a loader
 * here (or the reverse) is a compile error.
 */
// The seven cURL pages share one component (and one chunk).
const curl = dynamic(() => import("@/components/tools/curl-converter").then((m) => m.CurlConverter));
const cssUnit = dynamic(() => import("@/components/tools/css-unit-converter").then((m) => m.CssUnitConverter));

const LOADERS: Record<LiveSlug, ToolComponent> = {
  "json-diff": dynamic(() => import("@/components/tools/json-diff").then((m) => m.JsonDiff)),
  "json-formatter": dynamic(() => import("@/components/tools/json-formatter").then((m) => m.JsonFormatter)),
  "json-schema": dynamic(() => import("@/components/tools/json-schema").then((m) => m.JsonSchema)),
  "json-to-csv": dynamic(() => import("@/components/tools/json-to-csv").then((m) => m.JsonToCsv)),
  "json-to-go": dynamic(() => import("@/components/tools/json-to-go").then((m) => m.JsonToGo)),
  "json-to-python": dynamic(() => import("@/components/tools/json-to-python").then((m) => m.JsonToPython)),
  "json-to-rust": dynamic(() => import("@/components/tools/json-to-rust").then((m) => m.JsonToRust)),
  "json-to-typescript": dynamic(() => import("@/components/tools/json-to-typescript").then((m) => m.JsonToTypeScript)),
  "json-to-xml": dynamic(() => import("@/components/tools/json-to-xml").then((m) => m.JsonToXml)),
  "json-to-yaml": dynamic(() => import("@/components/tools/json-to-yaml").then((m) => m.JsonToYaml)),
  "json-to-zod": dynamic(() => import("@/components/tools/json-to-zod").then((m) => m.JsonToZod)),
  "jwt-decoder": dynamic(() => import("@/components/tools/jwt-decoder").then((m) => m.JwtDecoder)),
  "case-converter": dynamic(() => import("@/components/tools/text-case").then((m) => m.TextCase)),
  base64: dynamic(() => import("@/components/tools/base64").then((m) => m.Base64)),
  "code-formatter": dynamic(() => import("@/components/tools/code-formatter").then((m) => m.CodeFormatter)),
  "regex-tester": dynamic(() => import("@/components/tools/regex-tester").then((m) => m.RegexTester)),
  "sql-formatter": dynamic(() => import("@/components/tools/sql-formatter").then((m) => m.SqlFormatter)),
  "xml-formatter": dynamic(() => import("@/components/tools/xml-formatter").then((m) => m.XmlFormatter)),
  "color-converter": dynamic(() => import("@/components/tools/color-converter").then((m) => m.ColorConverter)),
  "css-unit-converter": cssUnit,
  // SEO alias routes — same component, slug-aware UI + content.
  "px-to-rem-converter": cssUnit,
  "rem-to-px-converter": cssUnit,
  "px-to-em-converter": cssUnit,
  "em-to-px-converter": cssUnit,
  "px-to-pt-converter": cssUnit,
  "pt-to-px-converter": cssUnit,
  "diff-checker": dynamic(() => import("@/components/tools/diff-checker").then((m) => m.DiffChecker)),
  "timestamp-converter": dynamic(() => import("@/components/tools/timestamp-converter").then((m) => m.TimestampConverter)),
  "image-compressor": dynamic(() => import("@/components/tools/image-compressor").then((m) => m.ImageCompressor)),
  "blur-placeholder": dynamic(() => import("@/components/tools/blur-placeholder").then((m) => m.BlurPlaceholder)),
  "merge-pdf": dynamic(() => import("@/components/tools/merge-pdf").then((m) => m.MergePdf)),
  "sign-pdf": dynamic(() => import("@/components/tools/sign-pdf").then((m) => m.SignPdf)),
  "split-pdf": dynamic(() => import("@/components/tools/split-pdf").then((m) => m.SplitPdf)),
  "compress-pdf": dynamic(() => import("@/components/tools/compress-pdf").then((m) => m.CompressPdf)),
  "image-to-pdf": dynamic(() => import("@/components/tools/image-to-pdf").then((m) => m.ImageToPdf)),
  "pdf-to-image": dynamic(() => import("@/components/tools/pdf-to-image").then((m) => m.PdfToImage)),
  "curl-to-code": curl,
  "curl-generator": curl,
  "curl-to-fetch": curl,
  "curl-to-axios": curl,
  "curl-to-python": curl,
  "curl-to-go": curl,
  "curl-to-php": curl,
  "url-encoder": dynamic(() => import("@/components/tools/url-encoder").then((m) => m.UrlEncoder)),
  "html-entity": dynamic(() => import("@/components/tools/html-entity").then((m) => m.HtmlEntity)),
  "hreflang-generator": dynamic(() => import("@/components/tools/hreflang-generator").then((m) => m.HreflangGenerator)),
  "hreflang-validator": dynamic(() => import("@/components/tools/hreflang-validator").then((m) => m.HreflangValidator)),
  "hreflang-sitemap": dynamic(() => import("@/components/tools/hreflang-sitemap").then((m) => m.HreflangSitemap)),
  "canonical-generator": dynamic(() => import("@/components/tools/canonical-generator").then((m) => m.CanonicalGenerator)),
  "robots-txt-generator": dynamic(() => import("@/components/tools/robots-txt-generator").then((m) => m.RobotsTxtGenerator)),
  "markdown-preview": dynamic(() => import("@/components/tools/markdown-preview").then((m) => m.MarkdownPreview)),
  "word-counter": dynamic(() => import("@/components/tools/word-counter").then((m) => m.WordCounter)),
  "url-parser": dynamic(() => import("@/components/tools/url-parser").then((m) => m.UrlParser)),
  "uuid-generator": dynamic(() => import("@/components/tools/uuid-generator").then((m) => m.UuidGenerator)),
  "cron-parser": dynamic(() => import("@/components/tools/cron-parser").then((m) => m.CronParser)),
  "password-generator": dynamic(() => import("@/components/tools/password-generator").then((m) => m.PasswordGenerator)),
  "yaml-to-json": dynamic(() => import("@/components/tools/yaml-to-json").then((m) => m.YamlToJson)),
  "csv-to-json": dynamic(() => import("@/components/tools/csv-to-json").then((m) => m.CsvToJson)),
  "sitemap-validator": dynamic(() => import("@/components/tools/sitemap-validator").then((m) => m.SitemapValidator)),
  "open-graph-generator": dynamic(() => import("@/components/tools/open-graph-generator").then((m) => m.OpenGraphGenerator)),
  "meta-preview": dynamic(() => import("@/components/tools/meta-preview").then((m) => m.MetaPreview)),
  "json-ld-generator": dynamic(() => import("@/components/tools/json-ld-generator").then((m) => m.JsonLdGenerator)),
  "seo-checker": dynamic(() => import("@/components/tools/seo-checker").then((m) => m.SeoChecker)),
};

/** Renders a live tool by slug, loading only that tool's code. */
export function ToolRenderer({ slug, tool }: { slug: string; tool: Tool }) {
  const Comp = (LOADERS as Record<string, ToolComponent | undefined>)[slug];
  return Comp ? <Comp tool={tool} /> : null;
}
