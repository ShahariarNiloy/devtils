import type { ComponentType } from "react";
import { Base64 } from "@/components/tools/base64";
import { CodeFormatter } from "@/components/tools/code-formatter";
import { ColorConverter } from "@/components/tools/color-converter";
import { CssUnitConverter } from "@/components/tools/css-unit-converter";
import { DiffChecker } from "@/components/tools/diff-checker";
import { JsonDiff } from "@/components/tools/json-diff";
import { ImageCompressor } from "@/components/tools/image-compressor";
import { JsonFormatter } from "@/components/tools/json-formatter";
import { JsonSchema } from "@/components/tools/json-schema";
import { JsonToCsv } from "@/components/tools/json-to-csv";
import { JsonToGo } from "@/components/tools/json-to-go";
import { JsonToPython } from "@/components/tools/json-to-python";
import { JsonToRust } from "@/components/tools/json-to-rust";
import { JsonToTypeScript } from "@/components/tools/json-to-typescript";
import { JsonToXml } from "@/components/tools/json-to-xml";
import { JsonToYaml } from "@/components/tools/json-to-yaml";
import { JsonToZod } from "@/components/tools/json-to-zod";
import { JwtDecoder } from "@/components/tools/jwt-decoder";
import { RegexTester } from "@/components/tools/regex-tester";
import { SqlFormatter } from "@/components/tools/sql-formatter";
import { XmlFormatter } from "@/components/tools/xml-formatter";
import { TextCase } from "@/components/tools/text-case";
import { TimestampConverter } from "@/components/tools/timestamp-converter";
import { UrlEncoder } from "@/components/tools/url-encoder";
import { HtmlEntity } from "@/components/tools/html-entity";
import { HreflangGenerator } from "@/components/tools/hreflang-generator";
import { HreflangValidator } from "@/components/tools/hreflang-validator";
import { HreflangSitemap } from "@/components/tools/hreflang-sitemap";
import { CanonicalGenerator } from "@/components/tools/canonical-generator";
import { RobotsTxtGenerator } from "@/components/tools/robots-txt-generator";
import { MarkdownPreview } from "@/components/tools/markdown-preview";
import { WordCounter } from "@/components/tools/word-counter";
import { UrlParser } from "@/components/tools/url-parser";
import { UuidGenerator } from "@/components/tools/uuid-generator";
import { CronParser } from "@/components/tools/cron-parser";
import { PasswordGenerator } from "@/components/tools/password-generator";
import { YamlToJson } from "@/components/tools/yaml-to-json";
import { CsvToJson } from "@/components/tools/csv-to-json";
import { SitemapValidator } from "@/components/tools/sitemap-validator";
import { OpenGraphGenerator } from "@/components/tools/open-graph-generator";
import { MetaPreview } from "@/components/tools/meta-preview";
import { JsonLdGenerator } from "@/components/tools/json-ld-generator";
import type { TOOLS } from "./tools/data";
import { LIVE_SLUGS } from "./tools/live";
import type { Tool } from "./tools/types";

export type ToolComponent = ComponentType<{ tool: Tool }>;

/**
 * Slugs known to the registry, as a string-literal union. The compiler can
 * now refuse any `COMPONENT_MAP` key that doesn't match an existing tool —
 * a typo here used to silently fall through to the "Coming soon"
 * placeholder, which is exactly the kind of drift a type can catch.
 */
type RegistrySlug = (typeof TOOLS)[number]["slug"];

/**
 * Map of registry slugs → built tool components. `Partial` because only a
 * subset of the registry is implemented at any time; `Record<RegistrySlug, …>`
 * keeps the keys constrained so typos / removed-from-registry slugs fail
 * the build instead of disappearing into runtime silence.
 */
export const COMPONENT_MAP: Partial<Record<RegistrySlug, ToolComponent>> = {
  "json-diff": JsonDiff,
  "json-formatter": JsonFormatter,
  "json-schema": JsonSchema,
  "json-to-csv": JsonToCsv,
  "json-to-go": JsonToGo,
  "json-to-python": JsonToPython,
  "json-to-rust": JsonToRust,
  "json-to-typescript": JsonToTypeScript,
  "json-to-xml": JsonToXml,
  "json-to-yaml": JsonToYaml,
  "json-to-zod": JsonToZod,
  "jwt-decoder": JwtDecoder,
  "case-converter": TextCase,
  base64: Base64,
  "code-formatter": CodeFormatter,
  "regex-tester": RegexTester,
  "sql-formatter": SqlFormatter,
  "xml-formatter": XmlFormatter,
  "color-converter": ColorConverter,
  "css-unit-converter": CssUnitConverter,
  // SEO alias routes — same component, slug-aware UI + content.
  "px-to-rem-converter": CssUnitConverter,
  "rem-to-px-converter": CssUnitConverter,
  "px-to-em-converter": CssUnitConverter,
  "em-to-px-converter": CssUnitConverter,
  "px-to-pt-converter": CssUnitConverter,
  "pt-to-px-converter": CssUnitConverter,
  "diff-checker": DiffChecker,
  "timestamp-converter": TimestampConverter,
  "image-compressor": ImageCompressor,
  "url-encoder": UrlEncoder,
  "html-entity": HtmlEntity,
  "hreflang-generator": HreflangGenerator,
  "hreflang-validator": HreflangValidator,
  "hreflang-sitemap": HreflangSitemap,
  "canonical-generator": CanonicalGenerator,
  "robots-txt-generator": RobotsTxtGenerator,
  "markdown-preview": MarkdownPreview,
  "word-counter": WordCounter,
  "url-parser": UrlParser,
  "uuid-generator": UuidGenerator,
  "cron-parser": CronParser,
  "password-generator": PasswordGenerator,
  "yaml-to-json": YamlToJson,
  "csv-to-json": CsvToJson,
  "sitemap-validator": SitemapValidator,
  "open-graph-generator": OpenGraphGenerator,
  "meta-preview": MetaPreview,
  "json-ld-generator": JsonLdGenerator,
};

export const IMPLEMENTED_TOOL_SLUGS: ReadonlySet<string> = new Set(
  Object.keys(COMPONENT_MAP),
);

// Keep the light LIVE_SLUGS list (used by the ⌘K palette) honest.
{
  const live = new Set(LIVE_SLUGS);
  const drift = [...IMPLEMENTED_TOOL_SLUGS].filter((s) => !live.has(s)).concat(LIVE_SLUGS.filter((s) => !IMPLEMENTED_TOOL_SLUGS.has(s)));
  if (drift.length) throw new Error(`src/lib/tools/live.ts is out of sync with COMPONENT_MAP: ${drift.join(", ")}`);
}

/**
 * Live tool count — the number that user-facing badges should show so the
 * headline figure matches working capability (vs. the catalogue-wide
 * SHOWCASE / TOOL_COUNT, which includes coming-soon entries). Counts up
 * automatically as more tools land in COMPONENT_MAP.
 */
export const LIVE_TOOL_COUNT = IMPLEMENTED_TOOL_SLUGS.size;

export function getToolComponent(slug: string): ToolComponent | undefined {
  return COMPONENT_MAP[slug as RegistrySlug];
}
