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
import { seoData as textCase } from "@/components/tools/text-case/content";
import { seoData as timestampConverter } from "@/components/tools/timestamp-converter/content";

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
  "case-converter": textCase,
  "timestamp-converter": timestampConverter,
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
