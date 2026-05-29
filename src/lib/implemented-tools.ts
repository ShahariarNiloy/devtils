import type { ComponentType } from "react";
import { Base64 } from "@/components/tools/base64";
import { ColorConverter } from "@/components/tools/color-converter";
import { DiffChecker } from "@/components/tools/diff-checker";
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
import { TextCase } from "@/components/tools/text-case";
import { TimestampConverter } from "@/components/tools/timestamp-converter";
import { TOOLS } from "./tools/data";
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
  "regex-tester": RegexTester,
  "color-converter": ColorConverter,
  "diff-checker": DiffChecker,
  "timestamp-converter": TimestampConverter,
  "image-compressor": ImageCompressor,
};

export const IMPLEMENTED_TOOL_SLUGS: ReadonlySet<string> = new Set(
  Object.keys(COMPONENT_MAP),
);

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
