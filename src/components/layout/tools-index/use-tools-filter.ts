"use client";

import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import type { Tool, ToolCategory } from "@/lib/tools-registry";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

export interface ToolsFilterState {
  cat: ToolCategory | null;
  setCat: (cat: ToolCategory | null) => void;
  query: string;
  setQuery: (query: string) => void;
  live: Tool[];
  soon: Tool[];
  filtered: Tool[];
  isFiltering: boolean;
}

export function useToolsFilter(
  tools: Tool[],
  initialCategory: ToolCategory | null,
  initialQuery: string,
): ToolsFilterState {
  const router = useRouter();
  const [cat, setCat] = useState<ToolCategory | null>(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const deferred = useDeferredValue(query);

  const isAvailable = (slug: string) => IMPLEMENTED_TOOL_SLUGS.has(slug);

  useEffect(() => {
    const p = new URLSearchParams();
    if (cat) p.set("cat", cat);
    if (query.trim()) p.set("q", query.trim());
    const qs = p.toString();
    router.replace(qs ? `/tools?${qs}` : "/tools", { scroll: false });
  }, [cat, query, router]);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    return tools.filter((t) => {
      if (cat && t.category !== cat) return false;
      if (!q) return true;
      return `${t.name} ${t.description} ${t.category} ${t.tags.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [tools, cat, deferred]);

  const live = filtered.filter((t) => isAvailable(t.slug));
  const soon = filtered.filter((t) => !isAvailable(t.slug));
  const isFiltering = Boolean(deferred.trim() || cat);

  return { cat, setCat, query, setQuery, live, soon, filtered, isFiltering };
}
