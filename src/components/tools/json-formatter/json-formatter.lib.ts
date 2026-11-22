import type {
  IndentStyle,
  SortOrder,
  ValidationState,
  JsonStats,
  DiffResult,
} from "./json-formatter.types";
import { formatLossless, scanJsonText } from "./json-lossless";

/**
 * Shared TextEncoder. Encoding is cheap, but instantiating a new encoder for
 * every byte-count call adds up across validation, stats, formatters, status
 * bar reads and recent-list writes. One module-scope instance fixes that.
 */
export const sharedEncoder = new TextEncoder();

/** Chars per encodeInto chunk; ≤ 3 bytes each, so a chunk fits BYTE_BUF. */
const BYTE_CHUNK = 1 << 18;
let byteBuf: Uint8Array | null = null;

/**
 * UTF-8 byte length. Large strings are encoded in chunks into one reused
 * 1 MB buffer instead of allocating the whole encoding — same count, but a
 * 76 MB document no longer allocates (and garbage-collects) 76 MB to learn
 * its size (≈350 ms → a few ms on the main thread).
 */
export function byteLength(s: string): number {
  if (s.length <= BYTE_CHUNK) return sharedEncoder.encode(s).length;
  byteBuf ??= new Uint8Array(BYTE_CHUNK * 3 + 4);
  let n = 0;
  for (let i = 0; i < s.length; ) {
    let end = Math.min(i + BYTE_CHUNK, s.length);
    // Never split a surrogate pair across chunks (it would count as 2 × U+FFFD).
    const last = s.charCodeAt(end - 1);
    if (end < s.length && last >= 0xd800 && last <= 0xdbff && (s.charCodeAt(end) & 0xfc00) === 0xdc00) end++;
    n += sharedEncoder.encodeInto(s.slice(i, end), byteBuf).written;
    i = end;
  }
  return n;
}

// ── Parsing & Serialisation ───────────────────────────────────────────────────

/** Parse raw string. Throws SyntaxError with accurate line/col from V8 message. */
export function parseJson(raw: string): unknown {
  return JSON.parse(raw);
}

/** Convert indent style to the value JSON.stringify expects. */
function indentArg(style: IndentStyle): string | number {
  return style === "tab" ? "\t" : Number(style);
}

/** Format a parsed value to a pretty-printed string. */
export function formatJson(value: unknown, indent: IndentStyle): string {
  return JSON.stringify(value, null, indentArg(indent));
}

/**
 * Format / minify (`indent: null`) / sort JSON *text* without altering data.
 * Uses the fast native path unless it would change a number or reorder
 * integer-like keys — then re-formats from the source tokens instead.
 * Pass `parsed` to skip the validating parse when the caller already has it.
 * Throws on invalid JSON.
 */
export function formatJsonText(
  raw: string,
  indent: IndentStyle | null,
  sort: SortOrder,
  parsed?: unknown,
): string {
  const value = parsed !== undefined ? parsed : JSON.parse(raw);
  if (scanJsonText(raw).needsLossless) {
    try {
      return formatLossless(raw, indent, sort);
    } catch (err) {
      // Only pathological nesting depth (stack overflow) falls back.
      if (!(err instanceof RangeError)) throw err;
    }
  }
  const v = sort !== "none" ? sortJsonKeys(value, sort) : value;
  return indent === null ? JSON.stringify(v) : formatJson(v, indent);
}

/** Strip all whitespace. Returns minified string + byte stats. */
export function minifyJson(
  raw: string,
): { output: string; before: number; after: number; savedPct: number } {
  const output = formatJsonText(raw, null, "none");
  const before = byteLength(raw);
  const after = byteLength(output);
  return {
    output,
    before,
    after,
    savedPct: before > 0 ? Math.round((1 - after / before) * 100) : 0,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Extract line/col from a native JSON.parse error message. */
function parseErrorPosition(
  err: unknown,
  source: string,
): { message: string; line: number; col: number } {
  const msg = err instanceof Error ? err.message : String(err);
  // V8: "Unexpected token … at position N"
  const posMatch = /position\s+(\d+)/i.exec(msg);
  if (posMatch) {
    const pos = Number(posMatch[1]);
    const before = source.slice(0, pos);
    const lines = before.split("\n");
    return {
      message: msg.replace(/\s*\(line[^)]*\)/, "").trim(),
      line: lines.length,
      col: (lines[lines.length - 1]?.length ?? 0) + 1,
    };
  }
  // Firefox / JSC: "at line N column N"
  const lineColMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(msg);
  if (lineColMatch) {
    return {
      message: msg,
      line: Number(lineColMatch[1]),
      col: Number(lineColMatch[2]),
    };
  }
  return { message: msg, line: 1, col: 1 };
}

/** Validate raw string and return a typed ValidationState. */
export function validateJson(raw: string): ValidationState {
  if (!raw.trim()) return { status: "idle" };
  try {
    JSON.parse(raw);
    const size = byteLength(raw);
    const lines = raw.split("\n").length;
    return { status: "valid", size, lines };
  } catch (err) {
    const { message, line, col } = parseErrorPosition(err, raw);
    return { status: "invalid", message, line, col };
  }
}

// ── Key sorting ───────────────────────────────────────────────────────────────

/** Sort all object keys recursively. Arrays preserve their element order. */
export function sortJsonKeys(value: unknown, order: "asc" | "desc"): unknown {
  if (Array.isArray(value)) return value.map((v) => sortJsonKeys(v, order));
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) =>
      order === "asc" ? a.localeCompare(b) : b.localeCompare(a),
    );
    const sorted: Record<string, unknown> = {};
    for (const k of keys) {
      // defineProperty, not assignment: `sorted["__proto__"] = …` would set
      // the prototype and silently drop the key from the output.
      Object.defineProperty(sorted, k, { value: sortJsonKeys(obj[k], order), enumerable: true, writable: true, configurable: true });
    }
    return sorted;
  }
  return value;
}

// ── Deduplication ────────────────────────────────────────────────────────────


// ── Escaping ─────────────────────────────────────────────────────────────────

/** Escape a JSON string for embedding in another JSON string. */
export function escapeJson(raw: string): string {
  return JSON.stringify(raw);
}

/** Unescape a double-encoded JSON string. */
export function unescapeJson(raw: string): string {
  return JSON.parse(raw) as string;
}

// ── Statistics ────────────────────────────────────────────────────────────────

/** Compute full stats over a parsed JSON value. */
export function computeStats(value: unknown): JsonStats {
  const stats: JsonStats = {
    size: 0,
    lines: 0,
    depth: 0,
    keys: 0,
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    arrays: 0,
    objects: 0,
  };

  function walk(v: unknown, d: number): void {
    if (d > stats.depth) stats.depth = d;
    if (v === null) {
      stats.nulls += 1;
    } else if (typeof v === "string") {
      stats.strings += 1;
    } else if (typeof v === "number") {
      stats.numbers += 1;
    } else if (typeof v === "boolean") {
      stats.booleans += 1;
    } else if (Array.isArray(v)) {
      stats.arrays += 1;
      v.forEach((item) => walk(item, d + 1));
    } else if (typeof v === "object") {
      stats.objects += 1;
      for (const k of Object.keys(v as Record<string, unknown>)) {
        stats.keys += 1;
        walk((v as Record<string, unknown>)[k], d + 1);
      }
    }
  }

  walk(value, 1);
  return stats;
}

/**
 * Maximum nesting depth and total object-key count, walked iteratively so a
 * pathologically deep document (thousands of levels) can't overflow the
 * call stack and take the page down.
 */
function shapeOf(value: unknown): { depth: number; keys: number } {
  let depth = 0;
  let keys = 0;
  const stack: [unknown, number][] = [[value, 1]];
  for (let top = stack.pop(); top; top = stack.pop()) {
    const [v, d] = top;
    if (d > depth) depth = d;
    if (Array.isArray(v)) {
      for (const c of v) stack.push([c, d + 1]);
    } else if (v !== null && typeof v === "object") {
      const vals = Object.values(v as Record<string, unknown>);
      keys += vals.length;
      for (const c of vals) stack.push([c, d + 1]);
    }
  }
  return { depth, keys };
}

/** Get the maximum nesting depth of any node (containers count their children's level). */
export function getDepth(value: unknown): number {
  return shapeOf(value).depth;
}

/** Count all object keys recursively. */
export function countKeys(value: unknown): number {
  return shapeOf(value).keys;
}

// ── Path utilities ───────────────────────────────────────────────────────────

/**
 * Get every JSONPath string for every node in the tree. `limit` early-exits
 * the walk — a 50 MB document has millions of paths, and building/holding
 * them all blocks the main thread for ~1s and balloons memory. Callers pass
 * a cap and surface a "first N" note.
 */
export function getAllPaths(
  value: unknown,
  root = "$",
  limit = Number.POSITIVE_INFINITY,
): string[] {
  const paths: string[] = [];
  const walk = (v: unknown, p: string): void => {
    if (paths.length >= limit) return;
    paths.push(p);
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        if (paths.length >= limit) return;
        walk(v[i], `${p}[${i}]`);
      }
    } else if (v !== null && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (paths.length >= limit) return;
        const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? `.${k}` : `["${k}"]`;
        walk(val, `${p}${key}`);
      }
    }
  };
  walk(value, root);
  return paths;
}

/** Evaluate a simple JSONPath expression. Returns array of matching values. */
export function queryJsonPath(value: unknown, path: string): unknown[] {
  // Lazy import — jsonpath-plus is large, only loaded when needed
  // Using dynamic require at call time keeps the module tree-shakeable
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSONPath } = require("jsonpath-plus") as { JSONPath: (opts: Record<string, unknown>) => unknown[] };
    return JSONPath({ path, json: value, wrap: true }) as unknown[];
  } catch {
    return [];
  }
}

// ── Diff ─────────────────────────────────────────────────────────────────────

/** Compute a structural diff between two JSON values. */
export function diffJson(a: unknown, b: unknown): DiffResult {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  function walk(av: unknown, bv: unknown, path: string): void {
    if (JSON.stringify(av) === JSON.stringify(bv)) return;

    const aIsObj = isPlainObject(av);
    const bIsObj = isPlainObject(bv);

    if (aIsObj && bIsObj) {
      const aObj = av as Record<string, unknown>;
      const bObj = bv as Record<string, unknown>;
      const aKeys = new Set(Object.keys(aObj));
      const bKeys = new Set(Object.keys(bObj));
      for (const k of aKeys) {
        if (!bKeys.has(k)) removed.push(`${path}.${k}`);
        else walk(aObj[k], bObj[k], `${path}.${k}`);
      }
      for (const k of bKeys) {
        if (!aKeys.has(k)) added.push(`${path}.${k}`);
      }
      return;
    }

    if (Array.isArray(av) && Array.isArray(bv)) {
      const len = Math.max(av.length, bv.length);
      for (let i = 0; i < len; i++) {
        if (i >= av.length) added.push(`${path}[${i}]`);
        else if (i >= bv.length) removed.push(`${path}[${i}]`);
        else walk(av[i], bv[i], `${path}[${i}]`);
      }
      return;
    }

    // Primitive mismatch — mark as changed
    changed.push(path);
  }

  walk(a, b, "$");
  return { added, removed, changed };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// ── Utilities ────────────────────────────────────────────────────────────────

const UNITS = ["B", "KB", "MB", "GB"] as const;

/** Format a byte count as a human-readable string (e.g. "4.2 KB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < UNITS.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${UNITS[i]}`;
}

/** True when the top-level value is a non-empty array of plain objects. */
export function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => isPlainObject(v))
  );
}

/** Extract the union of all keys from an array-of-objects. */
export function extractColumns(value: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  for (const item of value) for (const k of Object.keys(item)) seen.add(k);
  return Array.from(seen);
}

// ── Sample data ───────────────────────────────────────────────────────────────

/** Seeded pseudo-random integer in [0, max). Same sequence every call. */
function seededInt(seed: number, max: number): number {
  // Linear congruential generator
  const s = (seed * 1664525 + 1013904223) & 0xffffffff;
  return Math.abs(s) % max;
}

function generateLargeJson(): string {
  const firstNames = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Henry", "Iris", "Jack"];
  const lastNames = ["Smith", "Jones", "Brown", "Davis", "Wilson", "Taylor", "Clark", "Lewis", "Hall", "Moore"];
  const depts = ["Engineering", "Design", "Marketing", "Sales", "Support", "Finance", "Legal", "HR"];
  const items = Array.from({ length: 500 }, (_, i) => {
    const s1 = i * 7 + 1;
    const s2 = i * 13 + 3;
    const s3 = i * 17 + 5;
    const s4 = i * 19 + 7;
    return {
      id: i + 1,
      firstName: firstNames[seededInt(s1, firstNames.length)],
      lastName: lastNames[seededInt(s2, lastNames.length)],
      age: 22 + seededInt(s3, 43),
      department: depts[seededInt(s4, depts.length)],
      salary: 40000 + seededInt(s1 + s2, 80000),
      active: seededInt(s3 + s4, 4) !== 0,
    };
  });
  return JSON.stringify(items);
}

export const SAMPLE_DATA: Record<string, { label: string; json: string }> = {
  simple: {
    label: "Simple object",
    json: JSON.stringify(
      {
        name: "Alice",
        age: 30,
        email: "alice@example.com",
        address: { city: "New York", country: "USA" },
        active: true,
        score: null,
      },
      null,
      2,
    ),
  },
  array: {
    label: "Array of objects",
    json: JSON.stringify(
      [
        { id: 1, name: "Tom", role: "admin", active: true },
        { id: 2, name: "Maria", role: "editor", active: true },
        { id: 3, name: "Robert", role: "viewer", active: false },
        { id: 4, name: "Susan", role: "editor", active: true },
        { id: 5, name: "David", role: "viewer", active: false },
      ],
      null,
      2,
    ),
  },
  nested: {
    label: "Deeply nested",
    json: JSON.stringify(
      {
        company: {
          name: "Acme Corp",
          departments: {
            engineering: {
              teams: {
                frontend: { lead: "Alice", members: ["Bob", "Carol"], stack: ["React", "TypeScript"] },
                backend: { lead: "Dave", members: ["Eve", "Frank"], stack: ["Node.js", "PostgreSQL"] },
              },
            },
            design: {
              teams: {
                product: { lead: "Grace", members: ["Henry"], stack: ["Figma", "Storybook"] },
              },
            },
          },
        },
      },
      null,
      2,
    ),
  },
  large: {
    label: "Large (500 items)",
    json: generateLargeJson(),
  },
  geo: {
    label: "GeoJSON",
    json: JSON.stringify(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-73.9857, 40.7484] },
            properties: { name: "Empire State Building", category: "landmark" },
          },
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[[-74.044502, 40.689247], [-74.044502, 40.6975], [-74.0375, 40.6975], [-74.0375, 40.689247], [-74.044502, 40.689247]]],
            },
            properties: { name: "Liberty Island", category: "park" },
          },
        ],
      },
      null,
      2,
    ),
  },
  pkg: {
    label: "package.json style",
    json: JSON.stringify(
      {
        name: "my-app",
        version: "1.0.0",
        description: "A sample application",
        main: "dist/index.js",
        scripts: { dev: "next dev", build: "next build", test: "jest --coverage" },
        dependencies: { next: "16.x", react: "19.x", typescript: "5.x" },
        devDependencies: { jest: "^29.0.0", eslint: "^9.0.0" },
        keywords: ["web", "app", "typescript"],
        license: "MIT",
        author: { name: "Developer", email: "dev@example.com" },
      },
      null,
      2,
    ),
  },
};
