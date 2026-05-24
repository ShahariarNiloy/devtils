import type { ComponentType } from "react";
import { Base64 } from '@/components/tools/base64/base64';
import { ColorConverter } from '@/components/tools/color-converter/color-converter';
import { ImageCompressor } from '@/components/tools/image-compressor';
import { JsonFormatter } from '@/components/tools/json-formatter/json-formatter';
import { JwtDecoder } from '@/components/tools/jwt-decoder';
import { RegexTester } from '@/components/tools/regex-tester/regex-tester';
import { TextCase } from '@/components/tools/text-case/text-case';
import { TimestampConverter } from '@/components/tools/timestamp-converter';
import type { Tool } from "./tools-registry";

export type ToolComponent = ComponentType<{ tool: Tool }>;

/**
 * Map of registry slugs → built tool components. The registry lists every
 * tool DevToolbox plans to ship, but most are not implemented yet — those
 * routes render a "Coming soon" placeholder. When you finish a tool, drop
 * it in here and it becomes live.
 */
export const COMPONENT_MAP: Record<string, ToolComponent> = {
  "json-formatter": JsonFormatter,
  "jwt-decoder": JwtDecoder,
  "case-converter": TextCase,
  base64: Base64,
  "regex-tester": RegexTester,
  "color-converter": ColorConverter,
  "timestamp-converter": TimestampConverter,
  "image-compressor": ImageCompressor,
};

export const IMPLEMENTED_TOOL_SLUGS: ReadonlySet<string> = new Set(
  Object.keys(COMPONENT_MAP),
);

export function getToolComponent(slug: string): ToolComponent | undefined {
  return COMPONENT_MAP[slug];
}
