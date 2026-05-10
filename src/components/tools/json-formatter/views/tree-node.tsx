"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { PrimitiveValue } from "./tree-primitive-value";

export const INDENT = 18; // px per depth level

export interface TreeNodeProps {
  nodeKey: string | null;
  value: unknown;
  depth: number;
  search?: string;
  forceExpand?: number;
  forceCollapse?: number;
}

// ── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({ value }: { value: unknown }) {
  if (value === null)
    return <span className="text-text-faint text-sm font-mono opacity-50">null</span>;
  if (typeof value === "boolean")
    return <span className="text-sm font-mono opacity-50" style={{ color: "var(--color-clay)" }}>bool</span>;
  if (typeof value === "number")
    return <span className="text-sm font-mono opacity-50" style={{ color: "var(--color-clay)" }}>num</span>;
  if (typeof value === "string")
    return <span className="text-text-faint text-sm font-mono opacity-50">str</span>;
  return null;
}

// ── Search highlight ──────────────────────────────────────────────────────────

export function highlightMatch(text: string, search: string): React.ReactNode {
  if (!search) return text;
  const idx = text.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand/30 text-text rounded-sm not-italic">
        {text.slice(idx, idx + search.length)}
      </mark>
      {text.slice(idx + search.length)}
    </>
  );
}

// ── Tree node ─────────────────────────────────────────────────────────────────

export function TreeNode({ nodeKey, value, depth, search, forceExpand, forceCollapse }: TreeNodeProps) {
  const isExpandable = value !== null && typeof value === "object";
  // Expand root and first level by default — enough to grasp top-level schema
  const [expanded, setExpanded] = useState(depth <= 1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (forceExpand && forceExpand > 0) setExpanded(true);
  }, [forceExpand]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (forceCollapse && forceCollapse > 0) setExpanded(false);
  }, [forceCollapse]);

  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object" && !isArray;
  const childEntries: [string, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : isObject
      ? Object.entries(value as Record<string, unknown>)
      : [];

  // Count label — concise
  const countLabel = isArray
    ? `[${childEntries.length}]`
    : `{${childEntries.length}}`;

  // Key label
  const keySpan =
    nodeKey !== null ? (
      <span className="text-text font-semibold">
        {search
          ? highlightMatch(isArray ? `[${nodeKey}]` : nodeKey, search)
          : isArray
            ? <span className="text-text-faint font-normal">[{nodeKey}]</span>
            : nodeKey}
      </span>
    ) : null;

  // ── Leaf node ─────────────────────────────────────────────────────────────
  if (!isExpandable) {
    return (
      <div
        className="flex items-baseline gap-2 py-px group"
        style={{ paddingLeft: `${depth * INDENT}px` }}
      >
        {/* spacer matches chevron width so key text aligns with siblings */}
        <span className="w-4 shrink-0" />
        {keySpan && (
          <>
            {keySpan}
            <span className="text-text-faint select-none">:</span>
          </>
        )}
        <PrimitiveValue value={value} />
        <TypeBadge value={value} />
      </div>
    );
  }

  // ── Expandable node ───────────────────────────────────────────────────────
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className={cn(
          "flex items-center gap-1 py-0.5 text-left w-full rounded-md transition-colors",
          "hover:bg-surface-soft group",
          expanded && depth > 0 && "mb-px",
        )}
        style={{ paddingLeft: `${depth * INDENT}px` }}
      >
        {/* Chevron — w-4 fixed so leaf spacer aligns with text */}
        <span className="w-4 shrink-0 flex items-center justify-center text-text-faint">
          {expanded
            ? <ChevronDown size={12} />
            : <ChevronRight size={12} />}
        </span>

        {keySpan && (
          <>
            {keySpan}
            <span className="text-text-faint select-none">:</span>
          </>
        )}

        {/* Count + type hint */}
        <span className={cn(
          "text-sm font-mono ml-0.5",
          isArray ? "text-text-faint" : "text-text-faint",
        )}>
          {countLabel}
        </span>

        {/* Collapsed inline preview — shows first few values */}
        {!expanded && childEntries.length > 0 && childEntries.length <= 4 && !isArray && (
          <span className="ml-1 text-sm text-text-faint opacity-50 truncate max-w-48">
            {childEntries.slice(0, 4).map(([k]) => k).join(", ")}
          </span>
        )}
      </button>

      {/* Children — no wrapper padding; each child handles its own indent via depth */}
      {expanded && (
        <div className={cn(depth > 0 && "border-l border-border-subtle ml-[9px] pl-px")}>
          {childEntries.map(([k, v]) => (
            <TreeNode
              key={k}
              nodeKey={k}
              value={v}
              depth={depth + 1}
              search={search}
              forceExpand={forceExpand}
              forceCollapse={forceCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
