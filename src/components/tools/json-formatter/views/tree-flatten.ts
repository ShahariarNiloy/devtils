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
  /** The actual value at this node (primitive or subtree) — for copy. */
  raw: unknown;
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

/** Child keys: indices for arrays (no per-child tuples — a 300 K-item root
 *  array is walked on every expand/collapse). */
function keysOf(value: unknown, isArray: boolean): string[] | number {
  return isArray ? (value as unknown[]).length : Object.keys(value as Record<string, unknown>);
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
        raw: value,
        childCount: 0,
        preview: null,
        expanded: false,
      });
      return;
    }

    const isArr = kind === "array";
    const keys = keysOf(value, isArr);
    const childCount = typeof keys === "number" ? keys : keys.length;
    const expanded = isExpanded(path);
    const preview =
      typeof keys !== "number" && keys.length > 0 && keys.length <= 4
        ? keys.join(", ")
        : null;

    out.push({
      path,
      keyLabel,
      isIndex,
      depth,
      kind,
      value: undefined,
      raw: value,
      childCount,
      preview,
      expanded,
    });

    if (!expanded) return;
    if (typeof keys === "number") {
      const arr = value as unknown[];
      for (let i = 0; i < keys; i++) {
        const k = String(i);
        walk(arr[i], k, true, depth + 1, appendPath(path, k, true));
      }
    } else {
      const obj = value as Record<string, unknown>;
      for (const k of keys) walk(obj[k], k, false, depth + 1, appendPath(path, k, false));
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
    const keys = keysOf(value, isArr);
    if (typeof keys === "number") {
      const arr = value as unknown[];
      for (let i = 0; i < keys; i++) {
        if (set.size >= cap) return;
        walk(arr[i], depth + 1, appendPath(path, String(i), true));
      }
    } else {
      const obj = value as Record<string, unknown>;
      for (const k of keys) {
        if (set.size >= cap) return;
        walk(obj[k], depth + 1, appendPath(path, k, false));
      }
    }
  };

  walk(root, 0, "$");
  return set;
}
