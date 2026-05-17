/**
 * Tree flattening — pure, React-free. Turns a parsed JSON value into a flat,
 * preorder list of only the *visible* rows (collapsed subtrees are never
 * walked, so a collapsed 1M-node branch costs nothing). The flat list is what
 * makes the Tree view virtualizable.
 */

import { appendPath } from "../path-utils";

export type TreeKind = "leaf" | "object" | "array";

export interface FlatRow {
  /** JSONPath from root — stable, unique, used as the React key. */
  path: string;
  /** Display label for the key (null at the root). */
  keyLabel: string | null;
  /** True when the key is an array index (quieter styling). */
  isIndex: boolean;
  depth: number;
  kind: TreeKind;
  /** Leaf primitive. `undefined` for containers. */
  value: unknown;
  /** Entry count for containers. */
  childCount: number;
  /** Collapsed-object preview (first few keys), else null. */
  preview: string | null;
  /** Containers only: whether this node is currently expanded. */
  expanded: boolean;
}

function kindOf(v: unknown): TreeKind {
  if (Array.isArray(v)) return "array";
  if (v !== null && typeof v === "object") return "object";
  return "leaf";
}

function entriesOf(value: unknown, isArray: boolean): [string, unknown][] {
  return isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
}

export function flattenTree(
  root: unknown,
  isExpanded: (path: string) => boolean,
): FlatRow[] {
  const out: FlatRow[] = [];

  const walk = (
    value: unknown,
    keyLabel: string | null,
    isIndex: boolean,
    depth: number,
    path: string,
  ): void => {
    const kind = kindOf(value);

    if (kind === "leaf") {
      out.push({
        path,
        keyLabel,
        isIndex,
        depth,
        kind,
        value,
        childCount: 0,
        preview: null,
        expanded: false,
      });
      return;
    }

    const isArr = kind === "array";
    const entries = entriesOf(value, isArr);
    const expanded = isExpanded(path);
    const preview =
      !isArr && entries.length > 0 && entries.length <= 4
        ? entries.map(([k]) => k).join(", ")
        : null;

    out.push({
      path,
      keyLabel,
      isIndex,
      depth,
      kind,
      value: undefined,
      childCount: entries.length,
      preview,
      expanded,
    });

    if (!expanded) return;
    for (const [k, v] of entries) {
      walk(v, k, isArr, depth + 1, appendPath(path, k, isArr));
    }
  };

  walk(root, null, false, 0, "$");
  return out;
}

/**
 * Collect container paths to seed the expanded set. Bounded by `maxDepth`
 * (how deep to auto-expand) and `cap` (hard ceiling so "expand all" on a
 * giant document can't lock the tab).
 */
export function collectExpanded(
  root: unknown,
  maxDepth: number,
  cap: number,
): Set<string> {
  const set = new Set<string>();

  const walk = (value: unknown, depth: number, path: string): void => {
    if (set.size >= cap || depth > maxDepth) return;
    const kind = kindOf(value);
    if (kind === "leaf") return;
    set.add(path);
    const isArr = kind === "array";
    for (const [k, v] of entriesOf(value, isArr)) {
      if (set.size >= cap) return;
      walk(v, depth + 1, appendPath(path, k, isArr));
    }
  };

  walk(root, 0, "$");
  return set;
}
