"use client";

import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { getToolSearchableText } from "@/lib/tool-seo";
import type { Tool, ToolCategory, ToolTier } from "@/lib/tools-registry";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

export interface ToolsFilterState {
  cat: ToolCategory | null;
  setCat: (cat: ToolCategory | null) => void;
  tier: ToolTier | null;
  setTier: (tier: ToolTier | null) => void;
  query: string;
  setQuery: (query: string) => void;
  live: Tool[];
  soon: Tool[];
  filtered: Tool[];
  isFiltering: boolean;
}

/**
 * Single source of truth for the /tools index filter state. Synchronises
 * search + category + tier with the URL so a shared link reproduces what
 * the recipient sees, and survives a page refresh. The query is deferred
 * with `useDeferredValue` so heavy re-renders never block typing.
 */
export function useToolsFilter(
  tools: Tool[],
  initialCategory: ToolCategory | null,
  initialQuery: string,
  initialTier: ToolTier | null = null,
): ToolsFilterState {
  const router = useRouter();
  const [cat, setCat] = useState<ToolCategory | null>(initialCategory);
  const [tier, setTier] = useState<ToolTier | null>(initialTier);
  const [query, setQuery] = useState(initialQuery);
  const deferred = useDeferredValue(query);

  const isAvailable = (slug: string) => IMPLEMENTED_TOOL_SLUGS.has(slug);

  useEffect(() => {
    const p = new URLSearchParams();
    if (cat) p.set("cat", cat);
    if (tier) p.set("tier", tier);
    if (query.trim()) p.set("q", query.trim());
    const qs = p.toString();
    router.replace(qs ? `/tools?${qs}` : "/tools", { scroll: false });
  }, [cat, tier, query, router]);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return tools.filter((t) => {
      if (cat && t.category !== cat) return false;
      if (tier && t.tier !== tier) return false;
      if (!q) return true;
      // Quick haystack of the always-present registry fields. If the query
      // matches here, no need to touch the (larger) FAQ/use-case haystack.
      const primary = `${t.name} ${t.description} ${t.category} ${t.tags.join(" ")}`.toLowerCase();
      if (primary.includes(q)) return true;
      // Secondary haystack pulls from the tool's content.tsx seoData — lets
      // queries like "discriminated union" or "snake case tags" find tools
      // through the FAQ text and use-case descriptions even when the
      // tool's name / tags don't carry that phrase.
      const secondary = getToolSearchableText(t.slug);
      return secondary.length > 0 && secondary.includes(q);
    });
  }, [tools, cat, tier, deferred]);

  const live = filtered.filter((t) => isAvailable(t.slug));
  const soon = filtered.filter((t) => !isAvailable(t.slug));
  const isFiltering = Boolean(deferred.trim() || cat || tier);

  return {
    cat,
    setCat,
    tier,
    setTier,
    query,
    setQuery,
    live,
    soon,
    filtered,
    isFiltering,
  };
}

