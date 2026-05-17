/**
 * Pure JSON → graph model. No React, no DOM.
 *
 * A node is a *container* (object or array). Scalar properties render as
 * rows inside the node card; nested objects/arrays become child nodes
 * linked from the owning row. So node count = number of containers, not
 * keys — a mostly-scalar document of thousands of keys is only a handful
 * of nodes, which is what keeps the SVG render fast.
 *
 * Collapsing a node hides its whole subtree: the node and its rows still
 * render (link rows show a `{n}` / `[n]` summary) but no descendant nodes
 * or edges are emitted. Building stops at GRAPH_NODE_CAP and flags
 * `truncated` so the view can fall back to the Tree.
 */

export type NodeKind = "object" | "array" | "root-scalar";
export type ScalarType = "string" | "number" | "boolean" | "null";

export interface GraphRow {
  key: string;
  /** Scalar preview (present for leaf values). */
  value?: string;
  valueType?: ScalarType;
  /** Set when the row points at a child container. */
  childId?: string;
  childKind?: "object" | "array";
  childCount?: number;
  /** True when this node is collapsed, so the link has no expanded child. */
  collapsed?: boolean;
}

export interface GraphNode {
  id: string;
  path: string;
  /** How the parent refers to it: "$", "users", "[0]". */
  label: string;
  kind: NodeKind;
  rows: GraphRow[];
  width: number;
  height: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  fromRow: number;
  to: string;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootId: string;
  nodeCount: number;
  truncated: boolean;
}

// ── Sizing / spacing (SVG user units; shared with layout + render) ──────────
export const GRAPH_NODE_CAP = 600;
export const HEADER_H = 28;
export const ROW_H = 22;
export const NODE_PAD = 10;
export const CHAR_W = 7;
export const NODE_MIN_W = 140;
export const NODE_MAX_W = 320;
/** Gap between depth columns / sibling subtrees. */
export const H_GAP = 64;
export const V_GAP = 16;

const VALUE_PREVIEW_MAX = 40;

function isContainer(v: unknown): v is Record<string, unknown> | unknown[] {
  return v !== null && typeof v === "object";
}

function scalarType(v: unknown): ScalarType {
  if (v === null) return "null";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  return "string";
}

function preview(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") {
    const inner =
      v.length > VALUE_PREVIEW_MAX ? `${v.slice(0, VALUE_PREVIEW_MAX)}…` : v;
    return `"${inner}"`;
  }
  return String(v);
}

function rowLen(r: GraphRow): number {
  if (r.childId) {
    const summary = r.childKind === "array" ? `[${r.childCount}]` : `{${r.childCount}}`;
    return r.key.length + 3 + summary.length;
  }
  return r.key.length + 2 + (r.value?.length ?? 0);
}

function sizeNode(label: string, rows: GraphRow[]): { width: number; height: number } {
  let longest = label.length + 2;
  for (const r of rows) longest = Math.max(longest, rowLen(r));
  const width = Math.min(
    NODE_MAX_W,
    Math.max(NODE_MIN_W, longest * CHAR_W + NODE_PAD * 2),
  );
  const visibleRows = Math.max(rows.length, 1);
  const height = HEADER_H + visibleRows * ROW_H + NODE_PAD;
  return { width, height };
}

function childPath(path: string, key: string, isIndex: boolean): string {
  return isIndex ? `${path}[${key}]` : `${path}.${key}`;
}

export function buildGraph(
  root: unknown,
  collapsed: ReadonlySet<string>,
): GraphModel {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let count = 0;
  let truncated = false;

  function makeNode(
    value: Record<string, unknown> | unknown[],
    path: string,
    label: string,
  ): GraphNode | null {
    if (count >= GRAPH_NODE_CAP) {
      truncated = true;
      return null;
    }
    count += 1;

    const isArray = Array.isArray(value);
    const kind: NodeKind = isArray ? "array" : "object";
    const nodeCollapsed = collapsed.has(path);

    const entries: [string, unknown][] = isArray
      ? (value as unknown[]).map((v, i) => [String(i), v])
      : Object.entries(value as Record<string, unknown>);

    const rows: GraphRow[] = [];
    const links: { rowIndex: number; key: string; sub: unknown; cid: string }[] =
      [];

    entries.forEach(([k, sub], rowIndex) => {
      if (isContainer(sub)) {
        const subArray = Array.isArray(sub);
        const cid = childPath(path, k, isArray);
        rows.push({
          key: k,
          childId: cid,
          childKind: subArray ? "array" : "object",
          childCount: subArray
            ? (sub as unknown[]).length
            : Object.keys(sub as Record<string, unknown>).length,
          collapsed: nodeCollapsed,
        });
        links.push({ rowIndex, key: k, sub, cid });
      } else {
        rows.push({ key: k, value: preview(sub), valueType: scalarType(sub) });
      }
    });

    const { width, height } = sizeNode(label, rows);
    const node: GraphNode = { id: path, path, label, kind, rows, width, height };
    nodes.push(node);

    if (!nodeCollapsed) {
      for (const link of links) {
        const childNode = makeNode(
          link.sub as Record<string, unknown> | unknown[],
          link.cid,
          isArray ? `[${link.key}]` : link.key,
        );
        if (childNode) {
          edges.push({
            id: `${path}->${link.cid}`,
            from: path,
            fromRow: link.rowIndex,
            to: link.cid,
          });
        }
      }
    }
    return node;
  }

  if (isContainer(root)) {
    makeNode(root, "$", "$");
  } else {
    const rows: GraphRow[] = [
      { key: "", value: preview(root), valueType: scalarType(root) },
    ];
    const { width, height } = sizeNode("$", rows);
    nodes.push({
      id: "$",
      path: "$",
      label: "$",
      kind: "root-scalar",
      rows,
      width,
      height,
    });
    count += 1;
  }

  return { nodes, edges, rootId: "$", nodeCount: count, truncated };
}
