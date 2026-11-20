/**
 * Lossless JSON formatting.
 *
 * `JSON.parse` → `JSON.stringify` silently rewrites data:
 *   - integers beyond 2^53 are rounded   (12345678901234567890 → 12345678901234567000)
 *   - long decimals are rounded           (0.1000000000000000055 → 0.1)
 *   - out-of-range numbers become null    (1e400 → null)
 *   - number spelling changes             (1.50 → 1.5, 1e5 → 100000)
 *   - integer-like keys jump to the front ({"b":1,"1":2} → {"1":2,"b":1})
 *
 * This module re-formats from the *source text* instead: scalars (numbers,
 * strings, literals) are copied verbatim, only whitespace and key order
 * change. It's slower than the native path, so `formatJsonText` uses it only
 * when `scanJsonText` says the native path would alter something.
 *
 * Input must already be valid JSON (callers validate with JSON.parse first).
 * No React, no DOM.
 */

import type { IndentStyle, SortOrder } from "./json-formatter.types";

// ── Scan ─────────────────────────────────────────────────────────────────────

export interface JsonTextScan {
  /** True if JSON.parse → JSON.stringify would change any token or key order. */
  needsLossless: boolean;
  /** Numbers whose *value* JavaScript can't represent exactly. */
  impreciseNumbers: number;
}

/** Canonical value form of a JSON number token: sign + significant digits + exponent. */
function canonicalNumber(tok: string): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(tok);
  if (!m) return tok;
  const frac = m[3] ?? "";
  let digits = (m[2] + frac).replace(/^0+/, "");
  if (digits === "") return "0";
  let exp = Number(m[4] ?? 0) - frac.length;
  const trimmed = digits.replace(/0+$/, "");
  exp += digits.length - trimmed.length;
  digits = trimmed;
  return `${m[1]}${digits}e${exp}`;
}

/** Array-index-like keys that JS objects hoist to the front. */
const INDEX_KEY_RE = /^(?:0|[1-9]\d{0,9})$/;

function isNumberChar(c: number): boolean {
  // 0-9 . - + e E
  return (c >= 48 && c <= 57) || c === 46 || c === 45 || c === 43 || c === 101 || c === 69;
}

/** Single pass over the source text; skips string contents correctly. */
export function scanJsonText(raw: string): JsonTextScan {
  let needsLossless = false;
  let impreciseNumbers = 0;
  const n = raw.length;
  let i = 0;
  while (i < n) {
    const c = raw.charCodeAt(i);
    if (c === 34 /* " */) {
      const start = i;
      i++;
      while (i < n) {
        const d = raw.charCodeAt(i);
        if (d === 92 /* \ */) i += 2;
        else if (d === 34) break;
        else i++;
      }
      i++; // closing quote
      if (!needsLossless) {
        // Is this string a key? (next non-whitespace char is ':')
        let k = i;
        while (k < n && (raw.charCodeAt(k) === 32 || raw.charCodeAt(k) === 9 || raw.charCodeAt(k) === 10 || raw.charCodeAt(k) === 13)) k++;
        if (raw.charCodeAt(k) === 58 /* : */ && INDEX_KEY_RE.test(raw.slice(start + 1, i - 1))) {
          needsLossless = true;
        }
      }
      continue;
    }
    if (c === 45 || (c >= 48 && c <= 57)) {
      const start = i;
      while (i < n && isNumberChar(raw.charCodeAt(i))) i++;
      const tok = raw.slice(start, i);
      const roundTrip = String(Number(tok));
      if (roundTrip !== tok) {
        needsLossless = true;
        if (canonicalNumber(roundTrip) !== canonicalNumber(tok)) impreciseNumbers++;
      }
      continue;
    }
    i++;
  }
  return { needsLossless, impreciseNumbers };
}

// ── Parse (valid JSON → AST of raw slices) ───────────────────────────────────

type LNode =
  | { t: "obj"; rawKeys: string[]; keys: string[]; vals: LNode[] }
  | { t: "arr"; items: LNode[] }
  | { t: "raw"; text: string };

const SCALAR_RE = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)$/;

function isWs(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 13;
}

class Reader {
  private i = 0;
  constructor(private readonly s: string) {}

  private ws(): void {
    while (this.i < this.s.length && isWs(this.s.charCodeAt(this.i))) this.i++;
  }

  private fail(): never {
    throw new SyntaxError(`Invalid JSON at position ${this.i}`);
  }

  /** Consume a closer or a comma; true when the container is closed. */
  private closes(closer: string): boolean {
    this.ws();
    const c = this.s[this.i++];
    if (c === closer) return true;
    if (c !== ",") this.fail();
    return false;
  }

  private str(): string {
    if (this.s[this.i] !== '"') this.fail();
    const start = this.i;
    this.i++;
    for (;;) {
      if (this.i >= this.s.length) this.fail();
      const c = this.s.charCodeAt(this.i);
      if (c === 92) this.i += 2;
      else if (c === 34) break;
      else this.i++;
    }
    this.i++;
    return this.s.slice(start, this.i);
  }

  /** Parse one complete document; trailing non-whitespace is an error. */
  document(): LNode {
    const node = this.value();
    this.ws();
    if (this.i !== this.s.length) this.fail();
    return node;
  }

  value(): LNode {
    this.ws();
    const c = this.s[this.i];
    if (c === "{") return this.obj();
    if (c === "[") return this.arr();
    if (c === '"') return { t: "raw", text: this.str() };
    const start = this.i;
    while (this.i < this.s.length) {
      const d = this.s[this.i];
      if (d === "," || d === "}" || d === "]" || isWs(d.charCodeAt(0))) break;
      this.i++;
    }
    const text = this.s.slice(start, this.i);
    if (!SCALAR_RE.test(text)) this.fail();
    return { t: "raw", text };
  }

  private obj(): LNode {
    this.i++; // {
    const rawKeys: string[] = [];
    const keys: string[] = [];
    const vals: LNode[] = [];
    // JSON.parse semantics: a duplicate key keeps its FIRST position but
    // takes the LAST value. Mirror that so both paths agree.
    const seen = new Map<string, number>();
    this.ws();
    if (this.s[this.i] === "}") {
      this.i++;
      return { t: "obj", rawKeys, keys, vals };
    }
    for (;;) {
      this.ws();
      const rawKey = this.str();
      const key = rawKey.includes("\\") ? (JSON.parse(rawKey) as string) : rawKey.slice(1, -1);
      this.ws();
      if (this.s[this.i++] !== ":") this.fail();
      const val = this.value();
      const at = seen.get(key);
      if (at === undefined) {
        seen.set(key, keys.length);
        rawKeys.push(rawKey);
        keys.push(key);
        vals.push(val);
      } else {
        vals[at] = val;
      }
      if (this.closes("}")) break;
    }
    return { t: "obj", rawKeys, keys, vals };
  }

  private arr(): LNode {
    this.i++; // [
    const items: LNode[] = [];
    this.ws();
    if (this.s[this.i] === "]") {
      this.i++;
      return { t: "arr", items };
    }
    for (;;) {
      items.push(this.value());
      if (this.closes("]")) break;
    }
    return { t: "arr", items };
  }
}

// ── Serialize ────────────────────────────────────────────────────────────────

function write(
  node: LNode,
  depth: number,
  out: string[],
  unit: string | null,
  sort: SortOrder,
): void {
  if (node.t === "raw") {
    out.push(node.text);
    return;
  }
  const nl = unit === null ? "" : "\n";
  const padIn = unit === null ? "" : unit.repeat(depth + 1);
  const pad = unit === null ? "" : unit.repeat(depth);
  if (node.t === "arr") {
    if (node.items.length === 0) {
      out.push("[]");
      return;
    }
    out.push("[", nl);
    node.items.forEach((it, idx) => {
      if (idx > 0) out.push(",", nl);
      out.push(padIn);
      write(it, depth + 1, out, unit, sort);
    });
    out.push(nl, pad, "]");
    return;
  }
  if (node.keys.length === 0) {
    out.push("{}");
    return;
  }
  const order = node.keys.map((_, idx) => idx);
  if (sort !== "none") {
    order.sort((a, b) =>
      sort === "asc"
        ? node.keys[a].localeCompare(node.keys[b])
        : node.keys[b].localeCompare(node.keys[a]),
    );
  }
  const sep = unit === null ? ":" : ": ";
  out.push("{", nl);
  order.forEach((k, idx) => {
    if (idx > 0) out.push(",", nl);
    out.push(padIn, node.rawKeys[k], sep);
    write(node.vals[k], depth + 1, out, unit, sort);
  });
  out.push(nl, pad, "}");
}

/** Re-format valid JSON text without touching any scalar token. */
export function formatLossless(raw: string, indent: IndentStyle | null, sort: SortOrder): string {
  const ast = new Reader(raw).document();
  let unit: string | null = null;
  if (indent === "tab") unit = "\t";
  else if (indent !== null) unit = " ".repeat(Number(indent));
  const out: string[] = [];
  write(ast, 0, out, unit, sort);
  return out.join("");
}
