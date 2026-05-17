/**
 * O(n) left-to-right tidy-tree layout for the JSON graph. Pure, no React.
 *
 * - x (depth axis): each depth gets a column whose width is the widest
 *   node at that depth; columns are laid out left→right with H_GAP.
 * - y (cross axis): post-order walk with a running cursor. Leaves consume
 *   vertical space sequentially (so subtrees never overlap); internal
 *   nodes are centred on the span of their children. Not a full contour
 *   algorithm, but correct (no overlaps) and linear — ample for the
 *   capped node count.
 */

import type { GraphModel, GraphNode } from "./json-graph.lib";
import { H_GAP, V_GAP } from "./json-graph.lib";

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

export interface GraphLayout {
  nodes: PositionedNode[];
  width: number;
  height: number;
}

export function layoutGraph(model: GraphModel): GraphLayout {
  const byId = new Map<string, GraphNode>();
  for (const n of model.nodes) byId.set(n.id, n);

  // Children in row order (edges were emitted in row order).
  const childrenOf = new Map<string, string[]>();
  for (const e of model.edges) {
    const list = childrenOf.get(e.from);
    if (list) list.push(e.to);
    else childrenOf.set(e.from, [e.to]);
  }

  const root = byId.get(model.rootId);
  if (!root) return { nodes: [], width: 0, height: 0 };

  // ── Depths + per-depth max width (iterative DFS) ─────────────────────────
  const depthOf = new Map<string, number>();
  const maxWAtDepth: number[] = [];
  const stack: { id: string; depth: number }[] = [{ id: root.id, depth: 0 }];
  while (stack.length > 0) {
    const { id, depth } = stack.pop() as { id: string; depth: number };
    depthOf.set(id, depth);
    const node = byId.get(id);
    if (node) {
      maxWAtDepth[depth] = Math.max(maxWAtDepth[depth] ?? 0, node.width);
    }
    for (const c of childrenOf.get(id) ?? []) {
      stack.push({ id: c, depth: depth + 1 });
    }
  }

  const columnX: number[] = [];
  let acc = 0;
  for (let d = 0; d < maxWAtDepth.length; d += 1) {
    columnX[d] = acc;
    acc += (maxWAtDepth[d] ?? 0) + H_GAP;
  }

  // ── Y assignment (post-order, cursor) ────────────────────────────────────
  const pos = new Map<string, { x: number; y: number }>();
  let cursor = 0;

  function place(id: string): void {
    const node = byId.get(id);
    if (!node) return;
    const depth = depthOf.get(id) ?? 0;
    const x = columnX[depth] ?? 0;
    const kids = childrenOf.get(id) ?? [];

    if (kids.length === 0) {
      pos.set(id, { x, y: cursor });
      cursor += node.height + V_GAP;
      return;
    }

    for (const c of kids) place(c);

    const first = byId.get(kids[0]);
    const last = byId.get(kids[kids.length - 1]);
    const firstPos = pos.get(kids[0]);
    const lastPos = pos.get(kids[kids.length - 1]);
    if (first && last && firstPos && lastPos) {
      const top = firstPos.y + first.height / 2;
      const bottom = lastPos.y + last.height / 2;
      pos.set(id, { x, y: (top + bottom) / 2 - node.height / 2 });
    } else {
      pos.set(id, { x, y: cursor });
      cursor += node.height + V_GAP;
    }
  }
  place(root.id);

  // ── Normalize to a 0,0 origin + compute bounds ───────────────────────────
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of model.nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + n.width);
    maxY = Math.max(maxY, p.y + n.height);
  }
  if (!Number.isFinite(minX)) {
    return { nodes: [], width: 0, height: 0 };
  }

  const nodes: PositionedNode[] = model.nodes.map((n) => {
    const p = pos.get(n.id) ?? { x: 0, y: 0 };
    return { ...n, x: p.x - minX, y: p.y - minY };
  });

  return { nodes, width: maxX - minX, height: maxY - minY };
}
