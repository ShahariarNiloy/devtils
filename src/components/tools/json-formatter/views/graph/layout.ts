/**
 * O(n) left-to-right tidy-tree layout for the JSON graph. Pure, no React.
 *
 * - x (depth axis): each depth gets a column whose width is the widest
 *   node at that depth; columns are laid out left→right with H_GAP.
 * - y (cross axis): block tidy layout. Each subtree reserves
 *   `max(nodeHeight, childrenBlock)` so a node taller than its children
 *   never bleeds into a sibling's band; nodes are centred within their
 *   reserved band. Not a full contour algorithm, but correct (no overlaps)
 *   and linear — ample for the capped node count.
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

  // ── Y assignment (block tidy layout) ─────────────────────────────────────
  // Each subtree reserves `max(nodeHeight, childrenBlock)` vertical space so a
  // node taller than its children (e.g. a 16-row object whose children are a
  // couple of small nodes) can't overflow into the next sibling's band.
  const pos = new Map<string, { x: number; y: number }>();
  const subtreeH = new Map<string, number>();

  function measure(id: string): number {
    const node = byId.get(id);
    if (!node) return 0;
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      subtreeH.set(id, node.height);
      return node.height;
    }
    let block = 0;
    kids.forEach((c, i) => {
      block += measure(c);
      if (i < kids.length - 1) block += V_GAP;
    });
    const h = Math.max(node.height, block);
    subtreeH.set(id, h);
    return h;
  }
  measure(root.id);

  function assign(id: string, top: number): void {
    const node = byId.get(id);
    if (!node) return;
    const depth = depthOf.get(id) ?? 0;
    const x = columnX[depth] ?? 0;
    const span = subtreeH.get(id) ?? node.height;
    // Centre the node's own box within the band its subtree reserves.
    pos.set(id, { x, y: top + (span - node.height) / 2 });

    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return;

    let block = 0;
    kids.forEach((c, i) => {
      block += subtreeH.get(c) ?? 0;
      if (i < kids.length - 1) block += V_GAP;
    });
    let run = top + (span - block) / 2;
    for (const c of kids) {
      assign(c, run);
      run += (subtreeH.get(c) ?? 0) + V_GAP;
    }
  }
  assign(root.id, 0);

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
