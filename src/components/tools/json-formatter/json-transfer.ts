/**
 * Chunked hand-over of a big parsed tree from the JSON worker.
 *
 * Structured-clone deserialization of a 50 MB tree is one main-thread task
 * of ~400 ms (+ GC) when it arrives as a single message. Instead the worker
 * sends a skeleton with the document's widest container emptied, then that
 * container's children in slices, one message each — so the main thread
 * deserializes the tree in many short tasks and reassembles it in order.
 *
 * Pure (no React / DOM): used by the worker (`splitForTransfer`) and by the
 * main thread (`applyPart`).
 */

/** Path from the root to the container a part belongs to. */
export type TransferPath = (string | number)[];

export type TransferPart =
  | { path: TransferPath; items: unknown[] }
  | { path: TransferPath; entries: [string, unknown][] };

/** Below this many source chars a tree goes in one message. */
export const CHUNK_ABOVE = 4_000_000;
/** Target source chars per part (~20–40 ms of deserialization each). */
const CHARS_PER_PART = 2_000_000;
/** A container with at least this many children is chunked where it is. */
const MIN_FANOUT = 64;
/** Node-count cap when sizing children to find the one that dominates. */
const WEIGHT_CAP = 50_000;

const isContainer = (v: unknown): v is Record<string, unknown> | unknown[] =>
  v !== null && typeof v === "object";
const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** Nodes under `v`, counted up to `cap`. */
function weight(v: unknown, cap: number): number {
  let n = 0;
  const stack: unknown[] = [v];
  while (stack.length > 0 && n < cap) {
    const x = stack.pop();
    n++;
    if (Array.isArray(x)) for (const c of x) stack.push(c);
    else if (isObject(x)) for (const k of Object.keys(x)) stack.push(x[k]);
  }
  return n;
}

/**
 * Split `root` for transfer. Mutates `root` (the worker discards it after):
 * the chunked container is replaced in place by an empty one of the same
 * kind, so its key position in the parent is kept. Returns `parts: []` when
 * the tree has no single wide container (it then goes whole).
 */
export function splitForTransfer(root: unknown, srcChars: number): { skeleton: unknown; parts: TransferPart[] } {
  const none = { skeleton: root, parts: [] };
  if (srcChars <= CHUNK_ABOVE || !isContainer(root)) return none;

  // Descend along the one child that dominates, until a wide container.
  const path: TransferPath = [];
  let parent: Record<string, unknown> | unknown[] | null = null;
  let node: Record<string, unknown> | unknown[] = root;
  for (;;) {
    const keys: (string | number)[] = Array.isArray(node) ? node.map((_, i) => i) : Object.keys(node);
    if (keys.length >= MIN_FANOUT) break;
    let heavy: string | number | null = null;
    for (const k of keys) {
      const child: unknown = Array.isArray(node) ? node[k as number] : node[k as string];
      if (weight(child, WEIGHT_CAP) < WEIGHT_CAP) continue;
      if (heavy !== null) return none; // several big children — no single spine
      heavy = k;
    }
    if (heavy === null) return none; // nothing big enough to be worth it
    const next: unknown = Array.isArray(node) ? node[heavy as number] : node[heavy as string];
    if (!isContainer(next)) return none;
    path.push(heavy);
    parent = node;
    node = next;
  }

  const count = Math.max(1, Math.min(Math.ceil(srcChars / CHARS_PER_PART), 256));
  const parts: TransferPart[] = [];
  let empty: Record<string, unknown> | unknown[];
  if (Array.isArray(node)) {
    const size = Math.ceil(node.length / count);
    for (let i = 0; i < node.length; i += size) parts.push({ path, items: node.slice(i, i + size) });
    empty = [];
  } else {
    const obj = node;
    const keys = Object.keys(obj);
    const size = Math.ceil(keys.length / count);
    for (let i = 0; i < keys.length; i += size) {
      parts.push({ path, entries: keys.slice(i, i + size).map((k): [string, unknown] => [k, obj[k]]) });
    }
    empty = {};
  }

  if (parent === null) return { skeleton: empty, parts };
  const last = path[path.length - 1];
  if (Array.isArray(parent)) parent[last as number] = empty;
  else parent[last as string] = empty;
  return { skeleton: root, parts };
}

/** Append `part` to its container in `skeleton` (in arrival order). */
export function applyPart(skeleton: unknown, part: TransferPart): void {
  let target: unknown = skeleton;
  for (const k of part.path) {
    target = Array.isArray(target) ? target[k as number] : (target as Record<string, unknown>)[k as string];
  }
  if ("items" in part) {
    const arr = target as unknown[];
    for (const v of part.items) arr.push(v);
  } else {
    const obj = target as Record<string, unknown>;
    // defineProperty, not assignment: a JSON key named "__proto__" must stay
    // an own data property, as JSON.parse made it.
    for (const [k, v] of part.entries) {
      Object.defineProperty(obj, k, { value: v, writable: true, enumerable: true, configurable: true });
    }
  }
}
