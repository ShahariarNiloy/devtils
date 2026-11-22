import {
  Ampersand,
  AppWindow,
  Atom,
  BadgeCheck,
  Binary,
  Bot,
  Box,
  Braces,
  Calculator,
  CalendarClock,
  CaseSensitive,
  Clock,
  Code,
  CodeXml,
  Cog,
  Database,
  Diff,
  FileCheck,
  FileCode,
  FileJson,
  FileLock,
  FileSpreadsheet,
  FileText,
  FingerprintPattern,
  GitCompare,
  Globe,
  Grid3x3,
  ImageDown,
  Image as ImageIcon,
  KeyRound,
  KeySquare,
  Languages,
  Link,
  Link2,
  ListChecks,
  ListTree,
  Network,
  Palette,
  Percent,
  Pilcrow,
  Regex,
  Ruler,
  Search,
  Share2,
  Sheet,
  Shield,
  ShieldCheck,
  SquareFunction,
  SquareM,
  Table,
  Tags,
  Triangle,
  Type,
  WholeWord,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ToolCategory } from "@/lib/tools/types";

/**
 * One icon per catalogue tool, picked for meaning and kept distinct within a
 * category. Named imports keep the bundle to these icons only (the generic
 * <ToolIcon> pulls in the whole Lucide set — avoid it in shared chrome).
 */
const TOOL_ICONS: Record<string, LucideIcon> = {
  // JSON
  "json-formatter": Braces,
  "json-to-typescript": Type,
  "json-to-zod": ShieldCheck,
  "json-to-go": Box,
  "json-to-python": SquareFunction,
  "json-to-rust": Cog,
  "json-to-yaml": ListTree,
  "json-to-xml": CodeXml,
  "json-to-csv": Sheet,
  "json-schema": ListChecks,
  "json-diff": Diff,
  "yaml-to-json": FileJson,
  "csv-to-json": FileSpreadsheet,
  // Text
  "regex-tester": Regex,
  "case-converter": CaseSensitive,
  "diff-checker": GitCompare,
  // Closest Lucide match to the Markdown mark (an "M" in a rounded rect).
  "markdown-preview": SquareM,
  "word-counter": WholeWord,
  // Encoding
  base64: Binary,
  "url-encoder": Percent,
  "html-entity": Ampersand,
  // Network
  "url-parser": Link2,
  // Calc
  "timestamp-converter": Clock,
  "uuid-generator": FingerprintPattern,
  "cron-parser": CalendarClock,
  "chmod-calculator": FileLock,
  // Security
  "jwt-decoder": KeySquare,
  "password-generator": KeyRound,
  // Code
  "sql-formatter": Database,
  "xml-formatter": FileCode,
  "code-formatter": Code,
  // Design
  "color-converter": Palette,
  "css-unit-converter": Ruler,
  // Image
  "image-compressor": ImageDown,
  "blur-placeholder": Grid3x3,
  // SEO
  "hreflang-generator": Languages,
  "hreflang-validator": BadgeCheck,
  "hreflang-sitemap": Network,
  "canonical-generator": Link,
  "robots-txt-generator": Bot,
  "sitemap-validator": FileCheck,
  "open-graph-generator": Share2,
  "meta-preview": AppWindow,
  "json-ld-generator": Tags,
};

const CATEGORY_ICONS: Record<ToolCategory, LucideIcon> = {
  JSON: Braces,
  Text: Pilcrow,
  Encoding: Binary,
  Image: ImageIcon,
  PDF: FileText,
  Code: Code,
  Design: Palette,
  Calc: Calculator,
  Network: Globe,
  Security: Shield,
  Data: Table,
  "Next.js": Triangle,
  React: Atom,
  SEO: Search,
};

export const toolIcon = (slug: string): LucideIcon => TOOL_ICONS[slug] ?? Wrench;
export const categoryIcon = (category: ToolCategory): LucideIcon => CATEGORY_ICONS[category] ?? Wrench;
/** A tool's own icon, falling back to its category's — for catalogue entries that aren't built yet. */
export const iconForTool = (tool: { slug: string; category: ToolCategory }): LucideIcon =>
  TOOL_ICONS[tool.slug] ?? CATEGORY_ICONS[tool.category] ?? Wrench;

/**
 * An icon sized to its keycap box: ~half the box, one stroke weight
 * everywhere, so every tool reads at the same optical size. The box (size,
 * radius, tint colour) stays on the parent; the icon uses currentColor.
 */
export function KeyIcon({ icon: Icon, box }: { icon: LucideIcon; box: number }) {
  const size = Math.round(box * 0.5);
  return <Icon size={size} strokeWidth={box >= 40 ? 1.75 : 2} aria-hidden="true" className="shrink-0" />;
}
