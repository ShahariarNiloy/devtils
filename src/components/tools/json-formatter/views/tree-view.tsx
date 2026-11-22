"use client";

import { useCallback, useMemo, useState } from "react";
import { TreeRow } from "./tree-node";
import { TreeBreadcrumb } from "./tree-breadcrumb";
import { collectExpanded, flattenTree, type FlatRow } from "./tree-flatten";
import { useVirtualList } from "./use-virtual-list";
import { useMeasuredVirtualList } from "./use-measured-virtual-list";

export interface TreeViewProps {
  value: unknown;
  search?: string;
  expandAll?: number;
  collapseAll?: number;
  /**
   * Wrap long values. Rows then have variable height, so wrap mode uses a
   * measured (variable-height) window instead of the fixed-height one.
   */
  wrap?: boolean;
}

const ROW_HEIGHT = 30;
const DEFAULT_DEPTH = 1; // auto-expand root + one level
const DEFAULT_CAP = 4_000; // stop auto-expanding huge docs (collapsed by default)
const EXPAND_ALL_CAP = 60_000; // hard ceiling for explicit "expand all"

export function TreeView({
  value,
  search,
  expandAll = 0,
  collapseAll = 0,
  wrap = false,
}: TreeViewProps) {
  // Focus path drives the breadcrumb. String form so memoized rows see stable
  // identities and the breadcrumb can tokenize it on the fly.
  const [focusPath, setFocusPath] = useState("$");
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    collectExpanded(value, DEFAULT_DEPTH, DEFAULT_CAP),
  );

  const handleActivate = useCallback((row: FlatRow) => {
    setFocusPath(row.path);
    if (row.kind === "leaf") return;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(row.path)) next.delete(row.path);
      else next.add(row.path);
      return next;
    });
  }, []);

  // Derived-from-props sync (no effect): when the document changes, reseed the
  // default expansion; when a force counter ticks, expand/collapse en masse.
  const [synced, setSynced] = useState({
    value,
    le: expandAll,
    lc: collapseAll,
  });
  if (synced.value !== value) {
    setSynced({ value, le: expandAll, lc: collapseAll });
    setExpanded(collectExpanded(value, DEFAULT_DEPTH, DEFAULT_CAP));
  } else if (synced.le !== expandAll) {
    setSynced({ ...synced, le: expandAll });
    setExpanded(collectExpanded(value, Infinity, EXPAND_ALL_CAP));
  } else if (synced.lc !== collapseAll) {
    setSynced({ ...synced, lc: collapseAll });
    setExpanded(new Set());
  }

  const rows = useMemo(
    () => flattenTree(value, (p) => expanded.has(p)),
    [value, expanded],
  );

  const {
    scrollRef: fixedRef,
    onScroll: fixedOnScroll,
    totalHeight: fixedTotal,
    offsetY: fixedOffset,
    startIndex: fixedStart,
    endIndex: fixedEnd,
  } = useVirtualList(rows.length, ROW_HEIGHT);
  const rowKeys = useMemo(() => rows.map((r) => r.path), [rows]);
  const {
    scrollRef: wrapRef,
    onScroll: wrapOnScroll,
    measure,
    totalHeight: wrapTotal,
    offsetY: wrapOffset,
    startIndex: wrapStart,
    endIndex: wrapEnd,
  } = useMeasuredVirtualList(rowKeys, ROW_HEIGHT);

  if (value === null || value === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-text-faint">
        <span className="text-sm">
          Paste or load JSON to explore its structure
        </span>
      </div>
    );
  }

  const slice = wrap ? rows.slice(wrapStart, wrapEnd) : rows.slice(fixedStart, fixedEnd);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {focusPath !== "$" && <TreeBreadcrumb path={focusPath} />}
      {wrap ? (
        // Wrap mode: variable-height rows, measured as they render.
        <div
          key="wrap"
          ref={wrapRef}
          onScroll={wrapOnScroll}
          className="flex-1 overflow-auto px-2 py-2.5 font-mono text-[13px]"
        >
          <div style={{ height: wrapTotal, position: "relative" }}>
            <div style={{ transform: `translateY(${wrapOffset}px)` }}>
              {slice.map((row) => (
                <div key={row.path} ref={measure} data-vkey={row.path}>
                  <TreeRow row={row} rowHeight={ROW_HEIGHT} search={search} wrap onActivate={handleActivate} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          key="fixed"
          ref={fixedRef}
          onScroll={fixedOnScroll}
          className="flex-1 overflow-auto px-2 py-2.5 font-mono text-[13px]"
        >
          <div style={{ height: fixedTotal, position: "relative" }}>
            <div style={{ transform: `translateY(${fixedOffset}px)` }}>
              {slice.map((row) => (
                <TreeRow
                  key={row.path}
                  row={row}
                  rowHeight={ROW_HEIGHT}
                  search={search}
                  onActivate={handleActivate}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
