/**
 * Tolerant recursive-descent JSON parser — the repair engine.
 *
 * Unlike a regex pipeline, this parser always knows *where it is in the JSON
 * grammar*, so every repair is structurally informed rather than a pattern
 * guess. It accepts the JSON5 superset (comments, single/smart quotes,
 * unquoted keys AND values, trailing commas, hex / +leading / .5 numbers,
 * Python literals) plus real-world garbage (console gutter junk, JSONP
 * wrappers, prefix/suffix noise, NDJSON / concatenated roots, truncation),
 * and emits a typed list of repair events with risk tiers + line/col.
 *
 * Output is produced by serializing the parsed AST, so the result is
 * *guaranteed* to be valid strict JSON (strings/keys via JSON.stringify,
 * numbers from pre-validated raw tokens). Number tokens keep their raw text
 * so big-integer / high-precision values survive the round-trip.
 *
 * No React, no DOM.
 */

// ── Repair events ────────────────────────────────────────────────────────────

/**
 * Risk classification for a repair:
 * - `safe`       — normalization that cannot change meaning (trailing comma,
 *                  quote style, unquoted key, missing comma, comments…).
 * - `lossy`      — changes or drops data (Infinity→null, dropped duplicate
 *                  key, stripped garbage/console junk, CSV quote collapse).
 * - `structural` — a larger structural assumption the user should eyeball
 *                  (wrapped multiple roots into an array, closed a truncated
 *                  string/bracket, inserted a missing colon).
 */
export type RepairRisk = "safe" | "lossy" | "structural";

export interface RepairEvent {
  message: string;
  risk: RepairRisk;
  /** 1-based line in the ORIGINAL input where the repair applied. */
  line: number;
  /** 1-based column in the original input. */
  col: number;
}

export interface ParseRepairResult {
  /** Valid strict JSON, pretty-printed with 2-space indent. */
  output: string;
  events: RepairEvent[];
}

export class ParseRepairError extends Error {
  readonly line: number;
  readonly col: number;
  readonly events: RepairEvent[];
  constructor(message: string, line: number, col: number, events: RepairEvent[]) {
    super(message);
    this.name = "ParseRepairError";
    this.line = line;
    this.col = col;
    this.events = events;
  }
}

// ── AST ──────────────────────────────────────────────────────────────────────

type Node =
  | { type: "object"; members: { key: string; value: Node }[] }
  | { type: "array"; items: Node[] }
  | { type: "string"; value: string }
  | { type: "number"; raw: string }
  | { type: "literal"; value: "true" | "false" | "null" };

// ── Character classes ────────────────────────────────────────────────────────

const OPEN_QUOTES = new Set(['"', "'", "‘", "’", "“", "”", "`"]);

function isWhitespace(c: string): boolean {
  return c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v" || c === " " || c === "﻿";
}
function isDigit(c: string): boolean {
  return c >= "0" && c <= "9";
}
function isIdentStart(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
}
/** A character that could begin a JSON value (or a tolerant extension). */
function isValueStart(c: string): boolean {
  return (
    c === "{" ||
    c === "[" ||
    OPEN_QUOTES.has(c) ||
    isDigit(c) ||
    c === "-" ||
    c === "+" ||
    c === "." ||
    isIdentStart(c)
  );
}
/** Characters that terminate a bare (unquoted) token. */
function isBareDelimiter(c: string): boolean {
  return (
    isWhitespace(c) ||
    c === "," ||
    c === ":" ||
    c === "{" ||
    c === "}" ||
    c === "[" ||
    c === "]" ||
    OPEN_QUOTES.has(c)
  );
}

// ── Parser ───────────────────────────────────────────────────────────────────

class RepairParser {
  private readonly s: string;
  private i = 0;
  readonly events: RepairEvent[] = [];

  constructor(input: string) {
    this.s = input;
  }

  // Position → 1-based line/col, computed lazily (only when emitting an event).
  private lineCol(pos: number): { line: number; col: number } {
    let line = 1;
    let col = 1;
    const max = Math.min(pos, this.s.length);
    for (let k = 0; k < max; k++) {
      if (this.s.charCodeAt(k) === 10) {
        line++;
        col = 1;
      } else {
        col++;
      }
    }
    return { line, col };
  }

  private emit(message: string, risk: RepairRisk, pos = this.i): void {
    const { line, col } = this.lineCol(pos);
    // Coalesce identical consecutive messages so the change list stays
    // readable (e.g. "Inserted missing comma" ×many → counted by caller).
    this.events.push({ message, risk, line, col });
  }

  private peek(offset = 0): string {
    return this.s[this.i + offset] ?? "";
  }
  private atEnd(): boolean {
    return this.i >= this.s.length;
  }

  /** Skip whitespace + line/block comments. Returns true if a comment was removed. */
  private skipTrivia(): void {
    for (;;) {
      const c = this.peek();
      if (isWhitespace(c)) {
        this.i++;
        continue;
      }
      if (c === "/" && this.peek(1) === "/") {
        const at = this.i;
        this.i += 2;
        while (!this.atEnd() && this.peek() !== "\n") this.i++;
        this.emit("Removed line comment", "safe", at);
        continue;
      }
      if (c === "/" && this.peek(1) === "*") {
        const at = this.i;
        this.i += 2;
        while (!this.atEnd() && !(this.peek() === "*" && this.peek(1) === "/")) this.i++;
        if (!this.atEnd()) this.i += 2;
        this.emit("Removed block comment", "safe", at);
        continue;
      }
      break;
    }
  }

  private isLiteralWord(w: string): boolean {
    return (
      w === "true" || w === "false" || w === "null" ||
      w === "True" || w === "False" || w === "None"
    );
  }

  /** Read (without consuming) the bare token at the cursor. */
  private peekBareword(): string {
    let k = this.i;
    while (k < this.s.length && !isBareDelimiter(this.s[k])) k++;
    return this.s.slice(this.i, k);
  }

  /**
   * Skip trivia AND non-value garbage until the next genuine root value or
   * EOF. Emits a single lossy event if anything was dropped.
   *
   * Key rule: at the TOP LEVEL, an unquoted bareword that isn't a JSON
   * literal (`callback`, `garbage`, console words) is garbage — real
   * top-level JSON values are objects, arrays, quoted strings, numbers, or
   * true/false/null. (Unquoted barewords ARE accepted as values *inside*
   * containers; that path doesn't go through here.)
   */
  private skipToValueStart(): boolean {
    this.skipTrivia();
    const at = this.i;
    let dropped = false;
    while (!this.atEnd()) {
      const c = this.peek();
      if (isValueStart(c)) {
        if (isIdentStart(c) && !this.isLiteralWord(this.peekBareword())) {
          dropped = true;
          this.i += this.peekBareword().length || 1;
          this.skipTrivia();
          continue;
        }
        break; // a genuine value-start
      }
      dropped = true;
      this.i++;
      this.skipTrivia();
    }
    if (dropped) this.emit("Stripped non-JSON text", "lossy", at);
    return !this.atEnd();
  }

  // ── Document ───────────────────────────────────────────────────────────────

  parseDocument(): Node {
    const roots: Node[] = [];
    for (;;) {
      if (!this.skipToValueStart()) break;
      const node = this.parseValue();
      // Phantom-key-value guard: a value at the TOP LEVEL followed by `:` is
      // not JSON — it's gutter junk like `app.js:42`. Discard the key, the
      // colon, and its value rather than absorbing it as a fake pair.
      this.skipTrivia();
      if (this.peek() === ":") {
        const at = this.i;
        this.i++; // consume ':'
        this.skipTrivia();
        if (isValueStart(this.peek())) this.parseValue(); // discard
        this.emit("Stripped non-JSON text", "lossy", at);
        continue;
      }
      roots.push(node);
      // Tolerate a separating comma between concatenated roots.
      this.skipTrivia();
      if (this.peek() === ",") this.i++;
    }

    if (roots.length === 0) {
      const { line, col } = this.lineCol(this.i);
      throw new ParseRepairError("No JSON value found in input", line, col, this.events);
    }
    if (roots.length === 1) return roots[0];
    this.emit(
      `Wrapped ${roots.length} top-level values into a JSON array (NDJSON / concatenated)`,
      "structural",
      0,
    );
    return { type: "array", items: roots };
  }

  // ── Values ───────────────────────────────────────────────────────────────

  private parseValue(): Node {
    this.skipTrivia();
    const c = this.peek();
    if (c === "{") return this.parseObject();
    if (c === "[") return this.parseArray();
    if (OPEN_QUOTES.has(c)) return this.parseString();
    if (isDigit(c) || c === "-" || c === "+" || c === ".") return this.parseNumberOrBareword();
    if (isIdentStart(c)) return this.parseBareword();
    // Nothing valid here — emit and produce null so the caller can continue.
    this.emit("Inserted null for missing value", "structural");
    return { type: "literal", value: "null" };
  }

  private parseObject(): Node {
    this.i++; // consume '{'
    const members: { key: string; value: Node }[] = [];
    for (;;) {
      this.skipTrivia();
      const c = this.peek();
      if (c === "}") {
        this.i++;
        break;
      }
      if (this.atEnd()) {
        this.emit("Closed unclosed object at end of input", "structural");
        break;
      }
      if (c === ",") {
        // Leading / duplicate comma inside object.
        this.i++;
        this.emit("Removed extra comma", "safe");
        continue;
      }
      // Key
      const key = this.parseKey();
      this.skipTrivia();
      if (this.peek() === ":") {
        this.i++;
      } else {
        this.emit("Inserted missing colon after key", "structural");
      }
      const value = this.parseValue();
      members.push({ key, value });
      // Separator handling
      this.skipTrivia();
      const sep = this.peek();
      if (sep === ",") {
        this.i++;
        // Trailing comma → next non-trivia is '}'.
        this.skipTrivia();
        if (this.peek() === "}") {
          this.i++;
          this.emit("Removed trailing comma", "safe");
          break;
        }
      } else if (sep === "}") {
        this.i++;
        break;
      } else if (this.atEnd()) {
        this.emit("Closed unclosed object at end of input", "structural");
        break;
      } else {
        // Missing comma between members.
        this.emit("Inserted missing comma", "safe");
      }
    }
    return this.dedupeKeys({ type: "object", members });
  }

  /** Drop duplicate object keys keeping the last (JSON.parse semantics). */
  private dedupeKeys(node: { type: "object"; members: { key: string; value: Node }[] }): Node {
    const seen = new Map<string, number>();
    let dup = false;
    node.members.forEach((m, idx) => {
      if (seen.has(m.key)) dup = true;
      seen.set(m.key, idx);
    });
    if (!dup) return node;
    const keep = new Set(seen.values());
    this.emit("Dropped duplicate object key(s), kept last", "lossy");
    return { type: "object", members: node.members.filter((_, idx) => keep.has(idx)) };
  }

  private parseArray(): Node {
    this.i++; // consume '['
    const items: Node[] = [];
    for (;;) {
      this.skipTrivia();
      const c = this.peek();
      if (c === "]") {
        this.i++;
        break;
      }
      if (this.atEnd()) {
        this.emit("Closed unclosed array at end of input", "structural");
        break;
      }
      if (c === ",") {
        this.i++;
        this.emit("Removed extra comma", "safe");
        continue;
      }
      const value = this.parseValue();
      items.push(value);
      this.skipTrivia();
      const sep = this.peek();
      if (sep === ",") {
        this.i++;
        this.skipTrivia();
        if (this.peek() === "]") {
          this.i++;
          this.emit("Removed trailing comma", "safe");
          break;
        }
      } else if (sep === "]") {
        this.i++;
        break;
      } else if (this.atEnd()) {
        this.emit("Closed unclosed array at end of input", "structural");
        break;
      } else {
        this.emit("Inserted missing comma", "safe");
      }
    }
    return { type: "array", items };
  }

  // ── Keys ─────────────────────────────────────────────────────────────────

  private parseKey(): string {
    const c = this.peek();
    if (OPEN_QUOTES.has(c)) {
      const node = this.parseString();
      return node.value;
    }
    // Unquoted (or number) key — read a bare token up to ':' / delimiter.
    const start = this.i;
    while (!this.atEnd() && !isBareDelimiter(this.peek())) this.i++;
    const raw = this.s.slice(start, this.i);
    if (raw.length === 0) {
      // Defensive: nothing readable; advance one char to avoid an infinite loop.
      this.i++;
      return "";
    }
    this.emit("Quoted unquoted key", "safe", start);
    return raw;
  }

  // ── Strings ────────────────────────────────────────────────────────────────

  private parseString(): { type: "string"; value: string } {
    const quote = this.peek();
    const start = this.i;
    if (quote !== '"') this.emit("Normalized quotes to double quotes", "safe", start);
    this.i++; // consume opening quote
    const closer = OPEN_QUOTES.has(quote) ? this.closingQuoteFor(quote) : '"';
    let out = "";
    for (;;) {
      if (this.atEnd()) {
        this.emit("Closed truncated string at end of input", "structural", start);
        break;
      }
      const c = this.peek();
      if (c === "\\") {
        const next = this.peek(1);
        out += this.decodeEscape(next);
        continue;
      }
      if (c === closer) {
        // CSV doubled-quote: `""` inside non-empty content is a literal
        // quote, not the end of the string (`"she said ""hi"""`). Only when
        // there's content already, so empty strings `""` still close.
        if (this.peek(1) === closer && out.length > 0) {
          out += '"';
          this.i += 2;
          this.emit("Collapsed CSV doubled quotes", "lossy");
          continue;
        }
        this.i++; // consume closing quote
        break;
      }
      // A raw newline inside a string is invalid JSON. Decide whether the
      // string was unterminated (forgotten closing quote) or genuinely
      // multi-line content, by peeking at what follows.
      if (c === "\n" || c === "\r") {
        if (this.looksUnterminated()) {
          this.emit("Closed unterminated string before line break", "structural", start);
          break;
        }
        out += c === "\n" ? "\n" : "\r";
        this.emit("Escaped literal line break inside string", "safe", this.i);
        this.i++;
        continue;
      }
      if (c === "\t") {
        out += "\t";
        this.i++;
        continue;
      }
      out += c;
      this.i++;
    }
    return { type: "string", value: this.decodeStringContent(out) };
  }

  private closingQuoteFor(q: string): string {
    if (q === "‘") return "’"; // ‘ ’
    if (q === "“") return "”"; // “ ”
    return q;
  }

  /** Consume a backslash escape and return the literal it denotes. */
  private decodeEscape(next: string): string {
    // \uXXXX
    if (next === "u") {
      const hex = this.s.slice(this.i + 2, this.i + 6);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        this.i += 6;
        return String.fromCharCode(parseInt(hex, 16));
      }
      // \u{XXXX}
      const m = /^\{([0-9a-fA-F]+)\}/.exec(this.s.slice(this.i + 2));
      if (m) {
        this.i += 2 + m[0].length;
        const code = parseInt(m[1], 16);
        this.emit("Expanded \\u{…} escape", "safe");
        try {
          return String.fromCodePoint(code);
        } catch {
          return "";
        }
      }
    }
    // \xFF
    if (next === "x") {
      const hex = this.s.slice(this.i + 2, this.i + 4);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        this.i += 4;
        this.emit("Expanded \\xFF escape", "safe");
        return String.fromCharCode(parseInt(hex, 16));
      }
    }
    this.i += 2;
    switch (next) {
      case '"': return '"';
      case "\\": return "\\";
      case "/": return "/";
      case "b": return "\b";
      case "f": return "\f";
      case "n": return "\n";
      case "r": return "\r";
      case "t": return "\t";
      case "'": return "'";
      case "`": return "`";
      case "\n": return ""; // line continuation
      default:
        // Unknown escape — keep the character literally (drop the backslash).
        return next;
    }
  }

  /** True if the text after the current newline resumes JSON structure. */
  private looksUnterminated(): boolean {
    let k = this.i + 1;
    while (k < this.s.length && (this.s[k] === " " || this.s[k] === "\t" || this.s[k] === "\r" || this.s[k] === "\n")) k++;
    const rest = this.s.slice(k);
    // Next meaningful char closes/continues structure, or looks like a new key.
    return (
      rest === "" ||
      rest[0] === "}" ||
      rest[0] === "]" ||
      rest[0] === "," ||
      /^["'][^"'\n]*["']\s*:/.test(rest) || // "key":
      /^[a-zA-Z_$][\w$]*\s*:/.test(rest) // key:
    );
  }

  // ── Numbers / barewords ──────────────────────────────────────────────────

  private parseNumberOrBareword(): Node {
    const start = this.i;
    while (!this.atEnd() && !isBareDelimiter(this.peek())) this.i++;
    const raw = this.s.slice(start, this.i);
    const lower = raw.toLowerCase();

    // Non-finite numerics → null (lossy: the value can't be represented).
    if (lower === "infinity" || lower === "-infinity" || lower === "+infinity" || lower === "nan") {
      this.emit(`${raw} → null (not representable in JSON)`, "lossy", start);
      return { type: "literal", value: "null" };
    }

    const normalized = this.normalizeNumber(raw, start);
    if (normalized !== null) return { type: "number", raw: normalized };

    // Not a number after all → treat as an unquoted string value.
    this.emit("Quoted unquoted value", "safe", start);
    return { type: "string", value: raw };
  }

  private parseBareword(): Node {
    const start = this.i;
    while (!this.atEnd() && !isBareDelimiter(this.peek())) this.i++;
    const raw = this.s.slice(start, this.i);
    switch (raw) {
      case "true":
        return { type: "literal", value: "true" };
      case "false":
        return { type: "literal", value: "false" };
      case "null":
        return { type: "literal", value: "null" };
      case "True":
      case "False": {
        this.emit(`Python ${raw} → ${raw.toLowerCase()}`, "safe", start);
        return { type: "literal", value: raw.toLowerCase() as "true" | "false" };
      }
      case "None":
        this.emit("Python None → null", "safe", start);
        return { type: "literal", value: "null" };
      case "undefined":
        this.emit("undefined → null", "lossy", start);
        return { type: "literal", value: "null" };
      case "NaN":
      case "Infinity":
        this.emit(`${raw} → null (not representable in JSON)`, "lossy", start);
        return { type: "literal", value: "null" };
      default:
        this.emit("Quoted unquoted value", "safe", start);
        return { type: "string", value: raw };
    }
  }

  /**
   * Normalize a messy numeric token to a valid JSON number string, or return
   * null if it isn't really a number. Handles: leading +, .5 → 0.5,
   * 5. → 5, hex (0x1F → 31), numeric separators (1_000), BigInt suffix
   * (123n), leading zeros (007 → 7).
   */
  private normalizeNumber(raw: string, at: number): string | null {
    let t = raw;

    // Hex literal.
    if (/^[+-]?0[xX][0-9a-fA-F]+$/.test(t)) {
      const neg = t[0] === "-";
      const hex = t.replace(/^[+-]?0[xX]/, "");
      const val = parseInt(hex, 16);
      if (!Number.isFinite(val)) return null;
      this.emit("Converted hex number to decimal", "safe", at);
      return (neg ? -val : val).toString();
    }

    // BigInt suffix.
    if (/n$/.test(t) && /^[+-]?\d[\d_]*n$/.test(t)) {
      t = t.slice(0, -1);
      this.emit("Removed BigInt n suffix", "safe", at);
    }

    // Numeric separators.
    if (t.includes("_")) {
      const stripped = t.replace(/_(?=\d)/g, "");
      if (stripped !== t) {
        t = stripped;
        this.emit("Removed numeric separators", "safe", at);
      }
    }

    // Leading +.
    if (t[0] === "+") {
      t = t.slice(1);
      this.emit("Removed leading + from number", "safe", at);
    }

    // .5 → 0.5  (also -.5 → -0.5)
    if (/^-?\.\d/.test(t)) {
      t = t.replace(/^(-?)\./, "$10.");
      this.emit("Added leading zero to decimal", "safe", at);
    }

    // 5. → 5
    if (/^-?\d+\.$/.test(t)) {
      t = t.slice(0, -1);
      this.emit("Removed trailing decimal point", "safe", at);
    }

    // Leading zeros: 007 → 7, -0042 → -42 (but keep 0, 0.5, 0e1).
    const lz = /^(-?)0+(\d)/.exec(t);
    if (lz && !/^-?0[.eE]/.test(t)) {
      t = t.replace(/^(-?)0+(\d)/, "$1$2");
      this.emit("Removed leading zeros from number", "safe", at);
    }

    // Final validation against the strict JSON number grammar.
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(t)) {
      return t;
    }
    // Big-int / high-precision integer the regex above accepts too; double-check
    // a pure integer of any length is allowed.
    if (/^-?\d+$/.test(t)) return t.replace(/^(-?)0+(\d)/, "$1$2");
    return null;
  }

  /** Decode HTML entities inside finished string content (lossy-free text). */
  private decodeStringContent(content: string): string {
    if (!content.includes("&")) return content;
    let next = content.replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (m) => {
      switch (m) {
        case "&amp;": return "&";
        case "&lt;": return "<";
        case "&gt;": return ">";
        case "&quot;": return '"';
        case "&apos;": return "'";
        case "&nbsp;": return " ";
        default: return m;
      }
    });
    next = next.replace(/&#(x[0-9a-fA-F]+|\d+);/gi, (m, digits: string) => {
      const code = digits[0].toLowerCase() === "x" ? parseInt(digits.slice(1), 16) : parseInt(digits, 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return m;
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    });
    if (next !== content) this.emit("Decoded HTML entities inside string", "safe");
    return next;
  }
}

// ── Serializer (AST → valid strict JSON) ─────────────────────────────────────

function serialize(node: Node, indent: number): string {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);
  switch (node.type) {
    case "string":
      return JSON.stringify(node.value);
    case "number":
      return node.raw;
    case "literal":
      return node.value;
    case "array": {
      if (node.items.length === 0) return "[]";
      const body = node.items.map((it) => padIn + serialize(it, indent + 1)).join(",\n");
      return `[\n${body}\n${pad}]`;
    }
    case "object": {
      if (node.members.length === 0) return "{}";
      const body = node.members
        .map((m) => `${padIn}${JSON.stringify(m.key)}: ${serialize(m.value, indent + 1)}`)
        .join(",\n");
      return `{\n${body}\n${pad}}`;
    }
  }
}

// ── Console pre-clean ────────────────────────────────────────────────────────
// Strips well-known browser-DevTools gutter artifacts that get picked up when
// you copy a logged object. The structural garbage-skip in the parser is the
// safety net; this layer exists so the change log is HONEST about what it
// removed and so leading repeat-count badges don't get mistaken for a value.

const CONSOLE_PATTERNS: { re: RegExp; label: string }[] = [
  // Leading timestamp: "12:34:56.789 "
  { re: /^\s*\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?\s+/, label: "timestamp" },
  // Disclosure triangles.
  { re: /[▶▼▸▾]\s*/g, label: "arrow" },
  // Type prefix: "Object {", "Array(3) [".
  { re: /\b(?:Object|Array)(?:\(\d+\))?\s+(?=[{[])/g, label: "type-prefix" },
];
// Source refs like "app.js:42" / "VM1234:56" anywhere they appear as bare junk.
const SOURCE_REF_RE = /\b(?:VM\d+|[\w.-]+\.(?:js|ts|jsx|tsx|mjs|cjs|html)):\d+(?::\d+)?\b/g;

function consolePreClean(input: string): { cleaned: string; removed: boolean } {
  let s = input;
  let removed = false;
  for (const { re } of CONSOLE_PATTERNS) {
    const next = s.replace(re, "");
    if (next !== s) {
      removed = true;
      s = next;
    }
  }
  // Source refs: only strip when the input also contains a structural value,
  // so we never eat a legitimate string that merely looks like "a.js:1".
  if (/[{[]/.test(s)) {
    const next = s.replace(SOURCE_REF_RE, "");
    if (next !== s) {
      removed = true;
      s = next;
    }
  }
  // Leading repeat-count badge ("3\n{...}") — only when a brace/bracket follows
  // and only as a standalone leading integer, so bare-number JSON survives.
  const countMatch = /^\s*\d+\s+(?=[{[])/.exec(s);
  if (countMatch) {
    s = s.slice(countMatch[0].length);
    removed = true;
  }
  return { cleaned: s, removed };
}

// ── Public entry ─────────────────────────────────────────────────────────────

export interface RunOptions {
  /** Strip DevTools console gutter artifacts before parsing. Default true. */
  consoleClean?: boolean;
}

/**
 * Parse + repair `input`, returning valid strict JSON plus the list of
 * repair events. Throws `ParseRepairError` only when there is genuinely no
 * JSON value to recover.
 */
export function parseAndRepair(input: string, opts: RunOptions = {}): ParseRepairResult {
  const events: RepairEvent[] = [];
  let s = input;

  // BOM.
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1);
    events.push({ message: "Stripped byte-order mark (BOM)", risk: "safe", line: 1, col: 1 });
  }

  if (opts.consoleClean !== false) {
    const { cleaned, removed } = consolePreClean(s);
    if (removed) {
      events.push({ message: "Removed console gutter artifacts", risk: "lossy", line: 1, col: 1 });
      s = cleaned;
    }
  }

  const parser = new RepairParser(s);
  let ast: Node;
  try {
    ast = parser.parseDocument();
  } catch (err) {
    if (err instanceof ParseRepairError) {
      throw new ParseRepairError(err.message, err.line, err.col, [...events, ...parser.events]);
    }
    throw err;
  }

  const output = serialize(ast, 0);
  return { output, events: [...events, ...parser.events] };
}
