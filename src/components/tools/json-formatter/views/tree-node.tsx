"use client";

import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { PrimitiveValue } from "./tree-primitive-value";
import { appendPath } from "../path-utils";

export const INDENT = 18; // px per depth level

export interface TreeNodeProps {
  nodeKey: string | null;
  value: unknown;
  depth: number;
  search?: string;
  /**
   * Force-expand and force-collapse are passed as monotonically-increasing
   * counters from the parent. Each node tracks the *last counter values it
   * applied* alongside its own expanded state, so a bump from the parent
   * flips the state without needing a useEffect — which was the source of the
   * set-state-in-effect lint warning and a cascade of re-renders.
   */
  forceExpand?: number;
  forceCollapse?: number;
  /**
   * JSONPath of this node from the document root (e.g. `$.users[0].email`).
   * Passed as a string so memoization holds — children that don't move keep
   * the same path string across renders. Default `"$"` for the root.
   */
  path?: string;
  /**
   * Notified when the user clicks this node. Caller is responsible for
   * keeping the callback identity stable (useCallback) so memoized children
   * don't re-render on every focus change.
   */
  onFocus?: (path: string) => void;
}

// ── Type badge ────────────────────────────────────────────────────────────────

const TypeBadge = memo(function TypeBadge({ value }: { value: unknown }) {
  if (value === null)
    return <span className="text-text-faint text-sm font-mono opacity-50">null</span>;
  if (typeof value === "boolean")
    return <span className="text-sm font-mono opacity-50" style={{ color: "var(--color-clay)" }}>bool</span>;
  if (typeof value === "number")
    return <span className="text-sm font-mono opacity-50" style={{ color: "var(--color-clay)" }}>num</span>;
  if (typeof value === "string")
    return <span className="text-text-faint text-sm font-mono opacity-50">str</span>;
  return null;
});

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

function TreeNodeImpl({
  nodeKey,
  value,
  depth,
  search,
  forceExpand = 0,
  forceCollapse = 0,
  path = "$",
  onFocus,
}: TreeNodeProps) {
  const isExpandable = value !== null && typeof value === "object";

  // Derived expanded state: track the last fe/fc counters we observed. If the
  // parent bumps one, we react during render rather than in a post-commit
  // effect. This avoids the set-state-in-effect cascade and is React-canonical.
  const [local, setLocal] = useState(() => ({
    expanded: depth <= 1,
    lastExpand: forceExpand,
    lastCollapse: forceCollapse,
  }));

  let expanded = local.expanded;
  if (forceExpand !== local.lastExpand) {
    expanded = true;
    setLocal({ expanded: true, lastExpand: forceExpand, lastCollapse: forceCollapse });
  } else if (forceCollapse !== local.lastCollapse) {
    expanded = false;
    setLocal({ expanded: false, lastExpand: forceExpand, lastCollapse: forceCollapse });
  }

  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object" && !isArray;

  // Heavy: entries / count / preview — memoize on value so we don't rebuild
  // these arrays on every parent re-render.
  const { childEntries, countLabel, collapsedPreview } = useMemo(() => {
    const entries: [string, unknown][] = isArray
      ? (value as unknown[]).map((v, i) => [String(i), v])
      : isObject
        ? Object.entries(value as Record<string, unknown>)
        : [];
    const count = isArray ? `[${entries.length}]` : `{${entries.length}}`;
    const preview =
      !isArray && entries.length > 0 && entries.length <= 4
        ? entries.slice(0, 4).map(([k]) => k).join(", ")
        : null;
    return { childEntries: entries, countLabel: count, collapsedPreview: preview };
  }, [value, isArray, isObject]);

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
        className="flex items-baseline gap-2 py-px group cursor-pointer"
        style={{ paddingLeft: `${depth * INDENT}px` }}
        onClick={() => onFocus?.(path)}
        role="button"
        tabIndex={-1}
      >
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
        onClick={() => {
          setLocal((p) => ({ ...p, expanded: !p.expanded }));
          onFocus?.(path);
        }}
        className={cn(
          "flex items-center gap-1 py-0.5 text-left w-full rounded-md transition-colors",
          "hover:bg-surface-soft group",
          expanded && depth > 0 && "mb-px",
        )}
        style={{ paddingLeft: `${depth * INDENT}px` }}
      >
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

        <span className="text-sm font-mono ml-0.5 text-text-faint">
          {countLabel}
        </span>

        {!expanded && collapsedPreview && (
          <span className="ml-1 text-sm text-text-faint opacity-50 truncate max-w-64">
            {collapsedPreview}
          </span>
        )}
      </button>

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
              path={appendPath(path, k, isArray)}
              onFocus={onFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Recursive component. Memoized so an unrelated re-render in the formatter
 * page (cursor move, status-bar update, search-term typing in another panel)
 * doesn't walk every node in the tree. Children get the same `value`
 * reference from JSON.parse so memo identity is preserved.
 */
export const TreeNode = memo(TreeNodeImpl);
