/**
 * Slug → SEO data resolver. Each tool's `content.tsx` exports a `seoData`
 * const that holds the intro / use cases / FAQs / related-tool slugs. This
 * module aggregates those into a single resolver so the JSON-LD generator
 * and the catalogue search index can both reach the same data without
 * dynamic imports at request time.
 *
 * Adding a new tool's SEO data: add a `seoData` export to its
 * `content.tsx`, then register the slug → import here.
 */

import type { ToolContentProps } from "@/components/shared/tool-content";
import { seoData as base64 } from "@/components/tools/base64/content";
import { seoData as codeFormatter } from "@/components/tools/code-formatter/content";
import { seoData as colorConverter } from "@/components/tools/color-converter/content";
import { seoData as diffChecker } from "@/components/tools/diff-checker/content";
import { seoData as imageCompressor } from "@/components/tools/image-compressor/content";
import { seoData as jsonFormatter } from "@/components/tools/json-formatter/content";
import { seoData as jsonSchema } from "@/components/tools/json-schema/content";
import { seoData as jsonToCsv } from "@/components/tools/json-to-csv/content";
import { seoData as jsonToGo } from "@/components/tools/json-to-go/content";
import { seoData as jsonToPython } from "@/components/tools/json-to-python/content";
import { seoData as jsonToRust } from "@/components/tools/json-to-rust/content";
import { seoData as jsonToTypeScript } from "@/components/tools/json-to-typescript/content";
import { seoData as jsonToXml } from "@/components/tools/json-to-xml/content";
import { seoData as jsonToYaml } from "@/components/tools/json-to-yaml/content";
import { seoData as jsonToZod } from "@/components/tools/json-to-zod/content";
import { seoData as jwtDecoder } from "@/components/tools/jwt-decoder/content";
import { seoData as regexTester } from "@/components/tools/regex-tester/content";
import { seoData as sqlFormatter } from "@/components/tools/sql-formatter/content";
import { seoData as xmlFormatter } from "@/components/tools/xml-formatter/content";
import { seoData as textCase } from "@/components/tools/text-case/content";
import { seoData as timestampConverter } from "@/components/tools/timestamp-converter/content";
import { seoData as urlEncoder } from "@/components/tools/url-encoder/content";
import { seoData as htmlEntity } from "@/components/tools/html-entity/content";
import { seoData as hreflangGenerator } from "@/components/tools/hreflang-generator/content";
import { seoData as hreflangValidator } from "@/components/tools/hreflang-validator/content";
import { seoData as hreflangSitemap } from "@/components/tools/hreflang-sitemap/content";
import { seoData as canonicalGenerator } from "@/components/tools/canonical-generator/content";
import { seoData as robotsTxtGenerator } from "@/components/tools/robots-txt-generator/content";
import { seoData as markdownPreview } from "@/components/tools/markdown-preview/content";
import { seoData as wordCounter } from "@/components/tools/word-counter/content";
import { seoData as urlParser } from "@/components/tools/url-parser/content";
import { seoData as uuidGenerator } from "@/components/tools/uuid-generator/content";
import { seoData as cronParser } from "@/components/tools/cron-parser/content";
import { seoData as passwordGenerator } from "@/components/tools/password-generator/content";
import { seoData as yamlToJson } from "@/components/tools/yaml-to-json/content";
import { seoData as csvToJson } from "@/components/tools/csv-to-json/content";
import { seoData as sitemapValidator } from "@/components/tools/sitemap-validator/content";
import { seoData as openGraphGenerator } from "@/components/tools/open-graph-generator/content";
import { seoData as metaPreview } from "@/components/tools/meta-preview/content";
import { seoData as jsonLdGenerator } from "@/components/tools/json-ld-generator/content";
import { seoData as jsonDiff } from "@/components/tools/json-diff/content";
import { seoData as cssUnitConverter } from "@/components/tools/css-unit-converter/content";

export type ToolSeoData = ToolContentProps;

const TOOL_SEO: Record<string, ToolSeoData> = {
  base64,
  "code-formatter": codeFormatter,
  "color-converter": colorConverter,
  "diff-checker": diffChecker,
  "image-compressor": imageCompressor,
  "json-formatter": jsonFormatter,
  "json-schema": jsonSchema,
  "json-to-csv": jsonToCsv,
  "json-to-go": jsonToGo,
  "json-to-python": jsonToPython,
  "json-to-rust": jsonToRust,
  "json-to-typescript": jsonToTypeScript,
  "json-to-xml": jsonToXml,
  "json-to-yaml": jsonToYaml,
  "json-to-zod": jsonToZod,
  "jwt-decoder": jwtDecoder,
  "regex-tester": regexTester,
  "sql-formatter": sqlFormatter,
  "xml-formatter": xmlFormatter,
  "case-converter": textCase,
  "timestamp-converter": timestampConverter,
  "url-encoder": urlEncoder,
  "html-entity": htmlEntity,
  "hreflang-generator": hreflangGenerator,
  "hreflang-validator": hreflangValidator,
  "hreflang-sitemap": hreflangSitemap,
  "canonical-generator": canonicalGenerator,
  "robots-txt-generator": robotsTxtGenerator,
  "markdown-preview": markdownPreview,
  "word-counter": wordCounter,
  "url-parser": urlParser,
  "uuid-generator": uuidGenerator,
  "cron-parser": cronParser,
  "password-generator": passwordGenerator,
  "yaml-to-json": yamlToJson,
  "csv-to-json": csvToJson,
  "sitemap-validator": sitemapValidator,
  "open-graph-generator": openGraphGenerator,
  "meta-preview": metaPreview,
  "json-ld-generator": jsonLdGenerator,
  "json-diff": jsonDiff,
  "css-unit-converter": cssUnitConverter,
};

export function getToolSeoData(slug: string): ToolSeoData | undefined {
  return TOOL_SEO[slug];
}

/** Flat searchable text per tool, lower-cased for the catalogue filter. */
export function getToolSearchableText(slug: string): string {
  const data = TOOL_SEO[slug];
  if (!data) return "";
  const useCases = data.useCases.map((u) => `${u.title} ${u.description}`).join(" ");
  const faqs = data.faqs.map((f) => `${f.question} ${f.answer}`).join(" ");
  return `${data.intro} ${useCases} ${faqs}`.toLowerCase();
}
