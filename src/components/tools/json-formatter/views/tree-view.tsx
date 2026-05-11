"use client";

import { useCallback, useState } from "react";
import { TreeNode } from "./tree-node";
import { TreeBreadcrumb } from "./tree-breadcrumb";

export interface TreeViewProps {
  value: unknown;
  search?: string;
  expandAll?: number;
  collapseAll?: number;
}

export function TreeView({ value, search, expandAll, collapseAll }: TreeViewProps) {
  // Focus path is local to the tree. It's a string in JSONPath form so the
  // breadcrumb can split it on the fly for display, and so memoized TreeNodes
  // see stable string identities for the `path` prop.
  const [focusPath, setFocusPath] = useState("$");

  // Stable callback so every memoized TreeNode receives the same identity
  // across re-renders — focus changes do *not* invalidate the whole tree.
  const handleFocus = useCallback((p: string) => setFocusPath(p), []);

  if (value === null || value === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-text-faint">
        <span className="text-sm">Paste or load JSON to explore its structure</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TreeBreadcrumb path={focusPath} />
      <div className="flex-1 overflow-auto p-4 font-mono text-base leading-relaxed tracking-tight">
        <TreeNode
          nodeKey={null}
          value={value}
          depth={0}
          search={search}
          forceExpand={expandAll}
          forceCollapse={collapseAll}
          path="$"
          onFocus={handleFocus}
        />
      </div>
    </div>
  );
}
