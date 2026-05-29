/**
 * Server-safe URL-param parsers for the /tools index. Kept in its own file
 * (no `"use client"`) so the server page can call them during render. The
 * client-side filter hook lives in `use-tools-filter.ts`.
 */

import type { ToolTier } from "@/lib/tools-registry";

const VALID_TIERS: ReadonlySet<ToolTier> = new Set<ToolTier>(["free", "pro", "ai"]);

export function parseTierParam(raw: string | undefined): ToolTier | null {
  if (!raw) return null;
  return VALID_TIERS.has(raw as ToolTier) ? (raw as ToolTier) : null;
}
