"use client";

import { cn } from "@/lib/cn";
import { Braces, Copy } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";
import type { FlatRow } from "./tree-flatten";
import { PrimitiveValue } from "./tree-primitive-value";

async function writeClipboard(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Couldn't access clipboard");
  }
}

export const INDENT = 18; // px per depth level
const BASE_PAD = 8; // px gutter before depth indentation

// ── Type badge ────────────────────────────────────────────────────────────────

/** Type pill on the right of every row (v2): "string", "array", … */
const TypeBadge = memo(function TypeBadge({ value }: { value: unknown }) {
  let type: string;
  if (value === null) type = "null";
  else if (Array.isArray(value)) type = "array";
  else type = typeof value;
  return (
    <span className="shrink-0 rounded-[5px] bg-white/5 px-[7px] py-px font-sans text-[11px] leading-[1.55] text-text-faint">
      {type}
    </span>
  );
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
  /** Wrap long values onto multiple lines (variable row height). */
  wrap?: boolean;
  /** Container → toggle expand; leaf → focus. TreeView decides. */
  onActivate: (row: FlatRow) => void;
}

function TreeRowImpl({
  row,
  rowHeight,
  search,
  wrap = false,
  onActivate,
}: TreeRowProps) {
  const {
    kind,
    keyLabel,
    isIndex,
    depth,
    value,
    childCount,
    preview,
    expanded,
  } = row;
  const isContainer = kind !== "leaf";
  const countLabel =
    kind === "array"
      ? `[${childCount} item${childCount === 1 ? "" : "s"}]`
      : `{${childCount} key${childCount === 1 ? "" : "s"}}`;

  const renderKey = (): React.ReactNode => {
    if (keyLabel === null) return null;
    if (search)
      return highlightMatch(isIndex ? `[${keyLabel}]` : keyLabel, search);
    if (isIndex)
      return <>{keyLabel}</>;
    return keyLabel;
  };

  const keySpan = (
    <span className="shrink-0 text-syntax-key">
      {keyLabel === null ? "root" : <>{renderKey()}:</>}
    </span>
  );

  const copyValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text =
      typeof row.raw === "string"
        ? row.raw
        : (JSON.stringify(row.raw, null, isContainer ? 2 : undefined) ??
          String(row.raw));
    void writeClipboard(
      text,
      isContainer ? "Subtree copied as JSON" : "Value copied"
    );
  };

  const copyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    void writeClipboard(row.path, "Path copied");
  };

  return (
    <div
      className={cn(
        "group/row relative flex gap-2 cursor-pointer select-none rounded-md",
        "hover:bg-white/[.04]",
        wrap ? "items-start py-1" : "items-center"
      )}
      style={{
        ...(wrap ? { minHeight: rowHeight } : { height: rowHeight }),
        paddingLeft: BASE_PAD + depth * INDENT,
        paddingRight: 12,
      }}
      onClick={() => onActivate(row)}
      role="button"
      tabIndex={-1}
    >
      {isContainer ? (
        // h-6 matches the text-base line-height (24px) so the icon centers on
        // the key's first line in both wrap (items-start) and non-wrap
        // (items-center) rows — without it the arrow floats above the key.
        <span aria-hidden="true" className="flex h-6 w-3 shrink-0 items-center justify-center text-[10px] text-text-faint">
          {expanded ? "▾" : "▸"}
        </span>
      ) : (
        <span className="h-6 w-3 shrink-0" />
      )}

      {keySpan}

      {isContainer ? (
        <>
          <span className="min-w-0 grow truncate text-text-faint">
            {countLabel}
            {!expanded && preview && <span className="ml-2 opacity-60">{preview}</span>}
          </span>
          <TypeBadge value={row.raw} />
        </>
      ) : (
        <span
          className={cn(
            "flex items-baseline gap-2 min-w-0",
            wrap
              ? "flex-1 basis-0 flex-wrap break-all [overflow-wrap:anywhere]"
              : "truncate"
          )}
        >
          <PrimitiveValue value={value} />
        </span>
      )}
      {!isContainer && (
        <>
          <span className="grow" />
          <TypeBadge value={value} />
        </>
      )}

      <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md bg-surface-soft/95 px-1 shadow-card group-hover/row:flex">
        <button
          type="button"
          onClick={copyPath}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-text-faint hover:bg-surface hover:text-text transition-colors"
          aria-label="Copy path"
          title="Copy path"
        >
          <Copy size={12} />
        </button>
        <button
          type="button"
          onClick={copyValue}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-text-faint hover:bg-surface hover:text-text transition-colors"
          aria-label={isContainer ? "Copy subtree as JSON" : "Copy value"}
          title={isContainer ? "Copy subtree as JSON" : "Copy value"}
        >
          <Braces size={12} />
        </button>
      </span>
    </div>
  );
}

/**
 * One flat tree row. Memoized so scrolling (which only changes the windowed
 * slice) doesn't re-render rows whose props are unchanged.
 */
export const TreeRow = memo(TreeRowImpl);
