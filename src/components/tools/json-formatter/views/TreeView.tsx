"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export interface TreeViewProps {
  value: unknown;
  search?: string;
  expandAll?: number;
  collapseAll?: number;
}

interface TreeNodeProps {
  nodeKey: string | null;
  value: unknown;
  depth: number;
  search?: string;
  forceExpand?: number;
  forceCollapse?: number;
}

const INDENT = 18; // px per depth level

// ── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({ value }: { value: unknown }) {
  if (value === null)
    return <span className="text-text-faint text-xs font-mono opacity-50">null</span>;
  if (typeof value === "boolean")
    return <span className="text-xs font-mono opacity-50" style={{ color: "var(--color-clay)" }}>bool</span>;
  if (typeof value === "number")
    return <span className="text-xs font-mono opacity-50" style={{ color: "var(--color-clay)" }}>num</span>;
  if (typeof value === "string")
    return <span className="text-text-faint text-xs font-mono opacity-50">str</span>;
  return null;
}

// ── Search highlight ──────────────────────────────────────────────────────────

function highlightMatch(text: string, search: string): React.ReactNode {
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

// ── Primitive value ───────────────────────────────────────────────────────────

function PrimitiveValue({ value }: { value: unknown }) {
  const handleCopy = useCallback(async () => {
    const text = value === null ? "null" : String(value);
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }, [value]);

  if (value === null) {
    return (
      <span
        className="text-text-faint italic cursor-pointer hover:opacity-70 transition-opacity"
        onClick={handleCopy}
        title="Click to copy"
      >
        null
      </span>
    );
  }
  if (typeof value === "boolean") {
    return (
      <span
        className="cursor-pointer hover:opacity-70 transition-opacity font-medium"
        style={{ color: "var(--color-clay)" }}
        onClick={handleCopy}
        title="Click to copy"
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span
        className="cursor-pointer hover:opacity-70 transition-opacity"
        style={{ color: "var(--color-clay)" }}
        onClick={handleCopy}
        title="Click to copy"
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "string") {
    const display = value.length > 80 ? `"${value.slice(0, 80)}…"` : `"${value}"`;
    return (
      <span
        className="text-brand cursor-pointer hover:opacity-70 transition-opacity break-all"
        onClick={handleCopy}
        title="Click to copy"
      >
        {display}
      </span>
    );
  }
  return <span className="text-text-muted">{String(value)}</span>;
}

// ── Tree node ─────────────────────────────────────────────────────────────────

function TreeNode({ nodeKey, value, depth, search, forceExpand, forceCollapse }: TreeNodeProps) {
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
          <span className="ml-1 text-xs text-text-faint opacity-50 truncate max-w-48">
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

// ── Tree view root ────────────────────────────────────────────────────────────

export function TreeView({ value, search, expandAll, collapseAll }: TreeViewProps) {
  if (value === null || value === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-text-faint">
        <span className="text-sm">Paste or load JSON to explore its structure</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 font-mono text-sm">
      <TreeNode
        nodeKey={null}
        value={value}
        depth={0}
        search={search}
        forceExpand={expandAll}
        forceCollapse={collapseAll}
      />
    </div>
  );
}
