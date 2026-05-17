"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  buildGraph,
  GRAPH_NODE_CAP,
  HEADER_H,
  ROW_H,
} from "./json-graph.lib";
import { layoutGraph, type PositionedNode } from "./layout";
import { GraphNode } from "./graph-node";
import { useGraphViewport } from "./use-graph-viewport";

export interface GraphViewProps {
  /** Parsed JSON document (output if present, else parsed input). */
  value: unknown;
  /** Optional: jump to the Tree view (offered on the over-cap fallback). */
  onUseTree?: () => void;
}

const EMPTY: ReadonlySet<string> = new Set();

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-faint">
      {children}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-muted shadow-card transition-colors hover:bg-surface-soft hover:text-text"
    >
      {children}
    </button>
  );
}

export default function GraphView({ value, onUseTree }: GraphViewProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Reset collapse when the document changes — sync-during-render (no
  // effect/cascade). Stale collapse ids from a different document would
  // otherwise linger and confuse expand/collapse-all.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (collapsed.size > 0) setCollapsed(new Set());
  }
  const { svgRef, groupRef, fit, zoomIn, zoomOut } = useGraphViewport();

  const onToggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  const collapseAll = useCallback(() => {
    const full = buildGraph(value, EMPTY);
    setCollapsed(
      new Set(
        full.nodes
          .filter((n) => n.kind !== "root-scalar" && n.rows.some((r) => r.childId))
          .map((n) => n.id),
      ),
    );
  }, [value]);

  const model = useMemo(() => buildGraph(value, collapsed), [value, collapsed]);
  const layout = useMemo(() => layoutGraph(model), [model]);

  // Re-fit whenever the laid-out content changes (new JSON / collapse).
  // DOM measure + transform write only — no React state, no cascade.
  useEffect(() => {
    fit(layout.width, layout.height);
  }, [fit, layout.width, layout.height]);

  if (value === null || value === undefined) {
    return <Centered>Paste or format JSON to explore it as a graph.</Centered>;
  }
  if (model.truncated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-text-faint">
          This document is too large to graph ({GRAPH_NODE_CAP}+ nodes). The
          Tree view handles documents this size better.
        </p>
        {onUseTree && (
          <button
            type="button"
            onClick={onUseTree}
            className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
          >
            Switch to Tree view
          </button>
        )}
      </div>
    );
  }
  if (layout.nodes.length === 0) {
    return <Centered>Nothing to graph.</Centered>;
  }

  const byId = new Map<string, PositionedNode>();
  for (const n of layout.nodes) byId.set(n.id, n);

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      {/* Toolbar */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <ToolbarButton label="Zoom out" onClick={zoomOut}>
          <ZoomOut size={15} />
        </ToolbarButton>
        <ToolbarButton label="Zoom in" onClick={zoomIn}>
          <ZoomIn size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Fit to view"
          onClick={() => fit(layout.width, layout.height)}
        >
          <Maximize2 size={15} />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border-subtle" aria-hidden />
        <ToolbarButton label="Collapse all" onClick={collapseAll}>
          <ChevronsDownUp size={15} />
        </ToolbarButton>
        <ToolbarButton label="Expand all" onClick={expandAll}>
          <ChevronsUpDown size={15} />
        </ToolbarButton>
      </div>

      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab touch-none select-none"
        role="img"
        aria-label="JSON document graph"
      >
        <g ref={groupRef}>
          {/* Edges */}
          <g
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth={1.5}
            opacity={0.5}
          >
            {model.edges.map((e) => {
              const p = byId.get(e.from);
              const c = byId.get(e.to);
              if (!p || !c) return null;
              const sx = p.x + p.width;
              const sy = p.y + HEADER_H + (e.fromRow + 0.5) * ROW_H;
              const ex = c.x;
              const ey = c.y + c.height / 2;
              const dx = Math.max(30, (ex - sx) / 2);
              return (
                <path
                  key={e.id}
                  d={`M ${sx} ${sy} C ${sx + dx} ${sy} ${ex - dx} ${ey} ${ex} ${ey}`}
                />
              );
            })}
          </g>

          {/* Nodes */}
          {layout.nodes.map((n, i) => (
            <GraphNode
              key={n.id}
              node={n}
              uid={i}
              collapsible={
                n.kind !== "root-scalar" && n.rows.some((r) => r.childId)
              }
              collapsed={collapsed.has(n.id)}
              onToggle={onToggle}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
