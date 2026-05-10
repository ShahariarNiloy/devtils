"use client";

import { TreeNode } from "./tree-node";

export interface TreeViewProps {
  value: unknown;
  search?: string;
  expandAll?: number;
  collapseAll?: number;
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
