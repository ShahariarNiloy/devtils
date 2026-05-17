"use client";

import { memo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { PrimitiveValue } from "./tree-primitive-value";
import type { FlatRow } from "./tree-flatten";

export const INDENT = 18; // px per depth level
const BASE_PAD = 12; // px gutter before depth indentation

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

// ── Flat row ──────────────────────────────────────────────────────────────────

interface TreeRowProps {
  row: FlatRow;
  rowHeight: number;
  search?: string;
  /** Container → toggle expand; leaf → focus. TreeView decides. */
  onActivate: (row: FlatRow) => void;
}

function TreeRowImpl({ row, rowHeight, search, onActivate }: TreeRowProps) {
  const { kind, keyLabel, isIndex, depth, value, childCount, preview, expanded } =
    row;
  const isContainer = kind !== "leaf";
  const countLabel = kind === "array" ? `[${childCount}]` : `{${childCount}}`;

  const renderKey = (): React.ReactNode => {
    if (keyLabel === null) return null;
    if (search) return highlightMatch(isIndex ? `[${keyLabel}]` : keyLabel, search);
    if (isIndex)
      return <span className="text-text-faint font-normal">[{keyLabel}]</span>;
    return keyLabel;
  };

  const keySpan =
    keyLabel !== null ? (
      <span className="text-text font-semibold shrink-0">{renderKey()}</span>
    ) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 cursor-pointer select-none",
        "hover:bg-surface-soft",
      )}
      style={{
        height: rowHeight,
        paddingLeft: BASE_PAD + depth * INDENT,
        paddingRight: 12,
      }}
      onClick={() => onActivate(row)}
      role="button"
      tabIndex={-1}
    >
      {isContainer ? (
        <span className="w-4 shrink-0 flex items-center justify-center text-text-faint">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {keySpan && (
        <>
          {keySpan}
          <span className="text-text-faint select-none shrink-0">:</span>
        </>
      )}

      {isContainer ? (
        <>
          <span className="text-sm font-mono text-text-faint shrink-0">
            {countLabel}
          </span>
          {!expanded && preview && (
            <span className="text-sm text-text-faint opacity-50 truncate">
              {preview}
            </span>
          )}
        </>
      ) : (
        <span className="flex items-baseline gap-2 min-w-0 truncate">
          <PrimitiveValue value={value} />
          <TypeBadge value={value} />
        </span>
      )}
    </div>
  );
}

/**
 * One flat tree row. Memoized so scrolling (which only changes the windowed
 * slice) doesn't re-render rows whose props are unchanged.
 */
export const TreeRow = memo(TreeRowImpl);
