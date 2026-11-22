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
    c === ")" ||
    OPEN_QUOTES.has(c)
  );
}

/** Max chars a kept-literal quote may run before we decide it was the real closer. */
const LITERAL_QUOTE_WINDOW = 512;
/** Wrong inner-quote guesses tolerated per document before guessing stops. */
const MAX_LITERAL_GUESS_FAILS = 8;
/** `key:` / `key-name :` ahead (sticky; set lastIndex before use). */
const KEY_AHEAD_RE = /[A-Za-z_$][\w$-]*\s*:/y;
/** `...` or `…` used as "items elided here" in pasted logs / docs. */
function isEllipsisAt(s: string, k: number): number {
  if (s[k] === "…") return 1;
  if (s[k] === "." && s[k + 1] === "." && s[k + 2] === ".") return 3;
  return 0;
}
/** Wrappers whose single argument is the real value (Mongo shell, JS, Python). */
const NUMERIC_WRAPPERS = new Set(["NumberLong", "NumberInt", "NumberDecimal", "Long", "Int32", "Int64", "Double", "Decimal128", "Decimal", "BigInt", "Number"]);

// ── Parser ───────────────────────────────────────────────────────────────────

class RepairParser {
  private readonly s: string;
  private i = 0;
  readonly events: RepairEvent[] = [];

  constructor(input: string) {
    this.s = input;
  }

  /** Offsets of every `\n`, built once on first use. */
  private newlines: number[] | null = null;

  // Position → 1-based line/col via binary search over the newline index.
  // (A linear rescan per event made large inputs with many repairs O(n²).)
  private lineCol(pos: number): { line: number; col: number } {
    if (this.newlines === null) {
      const nl: number[] = [];
      for (let k = 0; k < this.s.length; k++) {
        if (this.s.charCodeAt(k) === 10) nl.push(k);
      }
      this.newlines = nl;
    }
    const nl = this.newlines;
    const p = Math.min(pos, this.s.length);
    // Count newlines strictly before p.
    let lo = 0;
    let hi = nl.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (nl[mid] < p) lo = mid + 1;
      else hi = mid;
    }
    const lineStart = lo === 0 ? 0 : nl[lo - 1] + 1;
    return { line: lo + 1, col: p - lineStart + 1 };
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
      // `"key": …` with no `{` before it — an object missing its opener.
      if (roots.length === 0 && OPEN_QUOTES.has(this.peek()) && this.quotedKeyAhead()) {
        this.emit("Added missing opening {", "structural", this.i);
        roots.push(this.parseObject(true));
        this.skipTrivia();
        if (this.peek() === ",") this.i++;
        continue;
      }
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
    // Prose / log text around a real object (`INFO payload={…}`) leaves stray
    // scalars beside it. When there's a container, those are noise, not data.
    const containers = roots.filter((r) => r.type === "object" || r.type === "array");
    if (containers.length > 0 && containers.length < roots.length) {
      this.emit("Stripped non-JSON text", "lossy", 0);
      if (containers.length === 1) return containers[0];
      roots.splice(0, roots.length, ...containers);
    }
    this.emit(
      `Wrapped ${roots.length} top-level values into a JSON array (NDJSON / concatenated)`,
      "structural",
      0,
    );
    return { type: "array", items: roots };
  }

  /** At a quote: is it a `"key":` (string followed by a colon)? Pure lookahead. */
  private quotedKeyAhead(): boolean {
    const q = this.peek();
    const closer = this.closingQuoteFor(q);
    const s = this.s;
    let k = this.i + 1;
    const limit = Math.min(s.length, k + 200);
    while (k < limit && s[k] !== closer && s[k] !== "\n") k += s[k] === "\\" ? 2 : 1;
    if (k >= limit || s[k] !== closer) return false;
    k++;
    while (k < s.length && (s[k] === " " || s[k] === "\t")) k++;
    return s[k] === ":";
  }

  // ── Values ───────────────────────────────────────────────────────────────

  private parseValue(inObject = false): Node {
    this.skipTrivia();
    const c = this.peek();
    if (c === "{") return this.parseObject();
    if (c === "[") return this.parseArray();
    if (c === "(") {
      this.emit("Converted tuple (…) to array", "safe");
      return this.parseArray(")");
    }
    if (OPEN_QUOTES.has(c)) return this.parseString();
    if (isDigit(c) || c === "-" || c === "+" || c === ".") return this.parseNumberOrBareword();
    if (isIdentStart(c)) return this.parseBareword(inObject);
    // Nothing valid here — emit and produce null so the caller can continue.
    this.emit("Inserted null for missing value", "structural");
    return { type: "literal", value: "null" };
  }

  private parseObject(missingOpen = false): Node {
    if (!missingOpen) this.i++; // consume '{'
    const members: { key: string; value: Node }[] = [];
    for (;;) {
      this.skipTrivia();
      const c = this.peek();
      const ell = isEllipsisAt(this.s, this.i);
      if (ell) {
        this.emit("Removed truncation marker (… / ...) — the source left out data here", "lossy");
        this.i += ell;
        this.skipTrivia();
        if (this.peek() === ",") this.i++;
        continue;
      }
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
      // Mismatched closer (`{"a": 1]`): close the object and leave the `]`
      // for the enclosing array (or the top-level garbage skip).
      if (c === "]") {
        this.emit("Closed unclosed object before ]", "structural");
        break;
      }
      // Key
      const keyAt = this.i;
      const key = this.parseKey();
      this.skipTrivia();
      // Input cut off inside a key (`{"a": 1, "lo`): there's no value to
      // keep, so drop the fragment rather than inventing `"lo": null`.
      if (this.atEnd() && (this.lastKeyTruncated || this.lastKeyBare)) {
        this.emit("Dropped incomplete key at end of input", "lossy", keyAt);
        this.emit("Closed unclosed object at end of input", "structural");
        break;
      }
      if (this.peek() === ":") {
        this.i++;
      } else {
        this.emit("Inserted missing colon after key", "structural");
      }
      const value = this.parseValue(true);
      members.push({ key, value });
      // Separator handling
      this.skipTrivia();
      const sep = this.peek();
      if (sep === ",") {
        const commaAt = this.i;
        this.i++;
        // Trailing comma → next non-trivia is '}'.
        this.skipTrivia();
        if (this.peek() === "}") {
          this.i++;
          this.emit("Removed trailing comma", "safe", commaAt);
          break;
        }
      } else if (sep === "}") {
        this.i++;
        break;
      } else if (this.atEnd()) {
        this.emit("Closed unclosed object at end of input", "structural");
        break;
      } else if (sep !== "]") {
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

  private parseArray(closer: "]" | ")" = "]"): Node {
    this.i++; // consume '[' / '('
    const items: Node[] = [];
    for (;;) {
      this.skipTrivia();
      const c = this.peek();
      if (c === closer) {
        this.i++;
        break;
      }
      const ell = isEllipsisAt(this.s, this.i);
      if (ell) {
        this.emit("Removed truncation marker (… / ...) — the source left out data here", "lossy");
        this.i += ell;
        continue;
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
      // Mismatched closer (`[1, 2}`): close the array here and leave the `}`
      // for the enclosing object (or the top-level garbage skip) to consume.
      if (c === "}" || (closer === ")" && c === "]") || (closer === "]" && c === ")")) {
        this.emit(`Closed unclosed array before ${c}`, "structural");
        break;
      }
      // Anything else that can't start a value (`:`, `@`, `)`, …) must be
      // consumed here — parseValue() doesn't advance on it, so looping back
      // without consuming would spin forever.
      if (!isValueStart(c) && c !== "(") {
        this.i++;
        this.emit("Stripped unexpected character", "lossy", this.i - 1);
        continue;
      }
      const value = this.parseValue();
      items.push(value);
      this.skipTrivia();
      const sep = this.peek();
      if (sep === ",") {
        const commaAt = this.i;
        this.i++;
        this.skipTrivia();
        if (this.peek() === "]") {
          this.i++;
          this.emit("Removed trailing comma", "safe", commaAt);
          break;
        }
      } else if (sep === closer) {
        this.i++;
        break;
      } else if (this.atEnd()) {
        this.emit("Closed unclosed array at end of input", "structural");
        break;
      } else if (isValueStart(sep) || sep === "(") {
        this.emit("Inserted missing comma", "safe");
      }
      // Otherwise: junk / mismatched closer — handled at the top of the loop.
    }
    return { type: "array", items };
  }

  // ── Keys ─────────────────────────────────────────────────────────────────

  /** Set by parseKey: the key was cut off by end of input / was a bare word at EOF. */
  private lastKeyTruncated = false;
  private lastKeyBare = false;

  private parseKey(): string {
    const c = this.peek();
    this.lastKeyTruncated = false;
    this.lastKeyBare = false;
    if (OPEN_QUOTES.has(c)) {
      const node = this.parseString();
      this.lastKeyTruncated = this.lastStringTruncated;
      return node.value;
    }
    // Unquoted (or number) key — read a bare token up to ':' / delimiter.
    const start = this.i;
    while (!this.atEnd() && !isBareDelimiter(this.peek())) this.i++;
    // `first name: "x"` — an unquoted key with spaces runs to the colon.
    let raw: string;
    const next = this.peek();
    if (next === " " || next === "\t") {
      const colon = this.colonOnLine(this.i);
      if (colon !== -1) this.i = colon;
      raw = this.s.slice(start, this.i).trimEnd();
    } else {
      raw = this.s.slice(start, this.i); // common case: no extra copy
    }
    this.lastKeyBare = true;
    if (raw.length === 0) {
      // Defensive: nothing readable; advance one char to avoid an infinite loop.
      this.i++;
      return "";
    }
    this.emit("Quoted unquoted key", "safe", start);
    return raw;
  }

  /** Index of a `:` later on this line with only key-ish text before it, else -1 (bounded scan). */
  private colonOnLine(k: number): number {
    const s = this.s;
    const limit = Math.min(s.length, k + 80);
    for (let j = k; j < limit; j++) {
      const c = s[j];
      if (c === ":") return j;
      if (c === "\n" || c === "," || c === "{" || c === "}" || c === "[" || c === "]" || OPEN_QUOTES.has(c)) return -1;
    }
    return -1;
  }

  // ── Strings ────────────────────────────────────────────────────────────────

  /** Set by parseString: the last string ran into end of input. */
  private lastStringTruncated = false;
  /**
   * Inner-quote guesses that turned out wrong. After a few, this document
   * clearly doesn't contain unescaped quotes — stop guessing, so adversarial
   * input can't make every string scan its whole lookahead window.
   */
  private literalGuessFails = 0;

  /**
   * Parse a quoted string. Two pieces of judgement beyond a plain scanner:
   *
   * 1. A closing-quote character only ends the string if what follows makes
   *    sense after a string (`,` `}` `]` `:` `)` a line break, end of input,
   *    another quoted token, or a `key:`). Otherwise it's an unescaped quote
   *    inside the text (`"He said "hi""`, `'O'Brien'`) and is kept. If that
   *    guess doesn't pan out within a bounded window, we rewind and close at
   *    the first such quote, so a wrong guess costs O(window), never O(n).
   * 2. If a quote is followed by `key":`, the string was never closed — it
   *    ends before that key (`{"a": "x, "b": 2}` → `"x"`).
   *
   * Backslashes: when a string contains an escape that can't be real
   * (`\U`, `\p`) or starts like a Windows path (`C:\x`), every backslash
   * is kept literally instead of `\n`/`\t` silently becoming control chars.
   */
  private parseString(): { type: "string"; value: string } {
    const s = this.s;
    const len = s.length;
    const quote = s[this.i];
    const start = this.i;
    if (quote !== '"') this.emit("Normalized quotes to double quotes", "safe", start);
    const closer = OPEN_QUOTES.has(quote) ? this.closingQuoteFor(quote) : '"';
    const closerCode = closer.charCodeAt(0);
    const literalChar = quote === "'" || quote === "‘" || quote === "’" ? "'" : '"';
    const eventsAtStart = this.events.length;
    let rawBackslashes = this.startsLikeWindowsPath(start + 1);
    let rawReported = false;
    let out = "";
    // First quote kept as literal text (-1 = none): where to rewind if wrong.
    // Plain locals, not a closure — a captured `out` would be heap-allocated
    // and slow down every append in this, the parser's hottest loop.
    let lqPos = -1;
    let lqOutLen = 0;
    let lqEvents = 0;
    this.lastStringTruncated = false;
    this.i = start + 1; // consume opening quote

    for (;;) {
      // Fast path: copy a run of ordinary characters in one slice.
      const limit = lqPos >= 0 ? Math.min(len, lqPos + LITERAL_QUOTE_WINDOW + 1) : len;
      let k = this.i;
      while (k < limit) {
        const ch = s.charCodeAt(k);
        if (ch === closerCode || ch === 92 /* \\ */ || ch === 10 || ch === 13) break;
        k++;
      }
      if (k > this.i) {
        out += s.slice(this.i, k);
        this.i = k;
      }

      if (this.i >= len || (lqPos >= 0 && this.i - lqPos > LITERAL_QUOTE_WINDOW)) {
        if (lqPos >= 0) {
          // The kept-literal quote was the real closer after all.
          this.literalGuessFails++;
          this.i = lqPos + 1;
          out = out.slice(0, lqOutLen);
          this.events.length = lqEvents;
          break;
        }
        this.emit("Closed truncated string at end of input", "structural", start);
        this.lastStringTruncated = true;
        break;
      }

      const c = s[this.i];
      if (c === "\\") {
        if (rawBackslashes) {
          if (!rawReported) {
            rawReported = true;
            this.emit("Kept backslashes literally (looks like a Windows path)", "safe", start);
          }
          out += "\\";
          this.i++;
          continue;
        }
        if (!this.isRealEscape(this.i)) {
          // Restart this string keeping backslashes literally (bounded: once).
          rawBackslashes = true;
          this.events.length = eventsAtStart;
          if (quote !== '"') this.emit("Normalized quotes to double quotes", "safe", start);
          // (reported by the raw branch when it meets the first backslash)
          out = "";
          lqPos = -1;
          this.i = start + 1;
          continue;
        }
        out += this.decodeEscape(s[this.i + 1] ?? "");
        continue;
      }
      if (c === closer) {
        // CSV doubled-quote: `""` inside non-empty content is a literal
        // quote, not the end of the string (`"she said ""hi"""`). Only when
        // there's content already, so empty strings `""` still close.
        if (s[this.i + 1] === closer && out.length > 0) {
          out += '"';
          this.i += 2;
          this.emit("Collapsed CSV doubled quotes", "lossy");
          continue;
        }
        if (this.isStringEnd(this.i + 1)) {
          this.i++; // consume closing quote
          break;
        }
        // The next thing is a `key":` — this quote opens a key, so the
        // string was never closed. End it before the trailing `, `.
        if (this.keyFollowsQuote(this.i + 1, closer)) {
          const tail = /,?\s*$/.exec(out);
          const cut = tail ? tail[0].length : 0;
          out = out.slice(0, out.length - cut);
          this.i -= cut;
          if (lqPos >= 0) this.events.length = lqEvents;
          this.emit("Closed unterminated string before the next key", "structural", start);
          break;
        }
        // Too many wrong guesses in this document: plain closing quote.
        if (lqPos < 0 && this.literalGuessFails >= MAX_LITERAL_GUESS_FAILS) {
          this.i++;
          break;
        }
        // Unescaped quote inside the text: keep it, but remember where.
        if (lqPos < 0) {
          lqPos = this.i;
          lqOutLen = out.length;
          lqEvents = this.events.length;
          this.emit("Escaped unescaped quote inside string", "structural", this.i);
        }
        out += literalChar;
        this.i++;
        continue;
      }
      // A raw line break inside a string is invalid JSON. Decide whether the
      // string was unterminated (forgotten closing quote) or genuinely
      // multi-line content, by peeking at what follows.
      if (lqPos >= 0) {
        // A kept-literal quote never spans lines — it was the real closer.
        this.literalGuessFails++;
        this.i = lqPos + 1;
        out = out.slice(0, lqOutLen);
        this.events.length = lqEvents;
        break;
      }
      if (this.looksUnterminated()) {
        this.emit("Closed unterminated string before line break", "structural", start);
        break;
      }
      out += c;
      this.emit("Escaped literal line break inside string", "safe", this.i);
      this.i++;
    }
    return { type: "string", value: this.decodeStringContent(out) };
  }

  /** What follows a closing quote at `k` is something that can follow a string. */
  private isStringEnd(k: number): boolean {
    const s = this.s;
    const from = k;
    while (k < s.length && (s[k] === " " || s[k] === "\t")) k++;
    if (k >= s.length) return true;
    const c = s[k];
    // `"a" 1` / `"a" {` — whitespace then a value: a missing colon or comma,
    // not text. (Text right after an inner quote has no gap: `"scored "5"`.)
    if (k > from && (isDigit(c) || c === "{" || c === "[" || (c === "-" && isDigit(s[k + 1] ?? "")))) return true;
    if (k > from && (s.startsWith("true", k) || s.startsWith("false", k) || s.startsWith("null", k))) {
      const after = s[k + (s[k] === "f" ? 5 : 4)] ?? "";
      if (after === "" || isBareDelimiter(after)) return true;
    }
    if (c === "," || c === "}" || c === "]" || c === ":" || c === ")" || c === ";" || c === "\n" || c === "\r") return true;
    if (c === "/" && (s[k + 1] === "/" || s[k + 1] === "*")) return true; // comment
    if (OPEN_QUOTES.has(c)) return true; // next token (missing comma)
    // `"x" key: 1` — missing comma before an unquoted key.
    if (isIdentStart(c)) {
      KEY_AHEAD_RE.lastIndex = k;
      return KEY_AHEAD_RE.test(s);
    }
    return false;
  }

  /** A `key":` (closed by `closer`) starts at `k` — i.e. the quote before `k` opened a key. */
  private keyFollowsQuote(k: number, closer: string): boolean {
    const s = this.s;
    const limit = Math.min(s.length, k + 120);
    let j = k;
    while (j < limit && s[j] !== closer && s[j] !== "\n") j++;
    if (j >= limit || s[j] !== closer || j === k) return false;
    j++;
    while (j < s.length && (s[j] === " " || s[j] === "\t")) j++;
    return s[j] === ":";
  }

  /** True if the backslash at `k` starts an escape JSON/JS would accept. */
  private isRealEscape(k: number): boolean {
    const n = this.s[k + 1];
    switch (n) {
      case '"': case "\\": case "/": case "b": case "f": case "n": case "r": case "t":
      case "'": case "`": case "\n": case "\r":
        return true;
      case "u":
        return /^[0-9a-fA-F]{4}|^\{[0-9a-fA-F]+\}/.test(this.s.slice(k + 2, k + 12));
      case "x":
        return /^[0-9a-fA-F]{2}/.test(this.s.slice(k + 2, k + 4));
      default:
        return false;
    }
  }

  /** `C:\x` or `\\server` right after the opening quote. */
  private startsLikeWindowsPath(k: number): boolean {
    const s = this.s;
    const c0 = s[k], c1 = s[k + 1], c2 = s[k + 2], c3 = s[k + 3];
    if (c1 === ":" && c2 === "\\" && c3 !== "\\" && /[A-Za-z]/.test(c0 ?? "")) return true;
    return c0 === "\\" && c1 === "\\" && c2 !== undefined && /[A-Za-z0-9]/.test(c2);
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

  private parseBareword(inObject = false): Node {
    const start = this.i;
    while (!this.atEnd() && !isBareDelimiter(this.peek()) && this.peek() !== "(") this.i++;
    let raw = this.s.slice(start, this.i);

    // `new Date("…")` → treat like `Date("…")`.
    if (raw === "new") {
      let k = this.i;
      while (this.s[k] === " ") k++;
      if (isIdentStart(this.s[k] ?? "")) {
        this.i = k;
        const nameAt = k;
        while (!this.atEnd() && !isBareDelimiter(this.peek()) && this.peek() !== "(") this.i++;
        raw = this.s.slice(nameAt, this.i);
      }
    }
    // Constructor / wrapper call: ObjectId("…"), ISODate("…"), NumberLong(5)…
    if (this.peek() === "(" && /^[A-Za-z_$][\w$.]*$/.test(raw)) return this.parseCall(raw, start);

    // Object value with spaces: `status: in progress,` → "in progress".
    if (inObject && !this.isLiteralWord(raw) && raw !== "undefined" && raw !== "NaN" && raw !== "Infinity") {
      const end = this.barePhraseEnd(this.i);
      if (end > this.i) {
        this.i = end;
        raw = this.s.slice(start, end);
      }
    }
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
   * If more words follow on this line up to a `,` `}` `]` or line end — and
   * they don't look like the next `key:` — return where the phrase ends;
   * otherwise `k`. Bounded scan.
   */
  private barePhraseEnd(k: number): number {
    const s = this.s;
    if (s[k] !== " " && s[k] !== "\t") return k;
    const limit = Math.min(s.length, k + 200);
    let j = k;
    for (; j < limit; j++) {
      const c = s[j];
      if (c === "," || c === "}" || c === "]" || c === "\n" || c === "\r") break;
      if (c === ":" || c === "{" || c === "[" || c === "(" || OPEN_QUOTES.has(c)) return k;
      if (c === "/" && (s[j + 1] === "/" || s[j + 1] === "*")) break;
    }
    if (j >= limit && j < s.length) return k;
    while (j > k && (s[j - 1] === " " || s[j - 1] === "\t")) j--;
    return j;
  }

  /** `Name(args)` → the wrapped value (one arg), an array (several), or null (none). */
  private parseCall(name: string, start: number): Node {
    this.i++; // consume '('
    const args: Node[] = [];
    for (;;) {
      this.skipTrivia();
      if (this.atEnd()) break;
      const c = this.peek();
      if (c === ")") {
        this.i++;
        break;
      }
      if (c === ",") {
        this.i++;
        continue;
      }
      if (c === "}" || c === "]") break; // unclosed call — let the container close
      if (!isValueStart(c) && c !== "(") {
        this.i++;
        continue;
      }
      args.push(this.parseValue());
    }
    const short = name.split(".").pop() ?? name;
    this.emit(`Unwrapped ${short}(…) to its value`, "lossy", start);
    if (args.length === 0) return { type: "literal", value: "null" };
    if (args.length > 1) return { type: "array", items: args };
    const only = args[0];
    // NumberLong("5") → 5
    if (NUMERIC_WRAPPERS.has(short) && only.type === "string") {
      const n = this.normalizeNumber(only.value.trim(), start);
      if (n !== null) return { type: "number", raw: n };
    }
    return only;
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

// ── Envelope pre-pass ────────────────────────────────────────────────────────
// Undo the wrappers JSON typically arrives in. Each step is gated by a cheap
// marker check, so ordinary input pays a few `includes` calls and nothing else.

const FENCE_RE = /```[\w+-]*[ \t]*\r?\n([\s\S]*?)```/g;

/** Index of the first / last non-whitespace char (no copy, unlike trim()). */
function firstNonWs(s: string): number {
  let k = 0;
  while (k < s.length && s.charCodeAt(k) <= 32) k++;
  return k;
}
function lastNonWs(s: string): number {
  let k = s.length - 1;
  while (k >= 0 && s.charCodeAt(k) <= 32) k--;
  return k;
}

function unwrapEnvelopes(input: string, events: RepairEvent[]): string {
  let s = input;
  const ev = (message: string, risk: RepairRisk) => events.push({ message, risk, line: 1, col: 1 });
  const f = firstNonWs(s);
  const first = s[f];

  // URL-encoded: %7B / %5B up front and no literal braces or quotes.
  if (first === "%" && /^%(?:7B|5B|22)/i.test(s.slice(f, f + 3)) && !/["{[]/.test(s.slice(f, f + 2000))) {
    const head = s.slice(f);
    try {
      const decoded = decodeURIComponent(head.replace(/\+/g, "%20"));
      if (/^\s*[{["]/.test(decoded)) {
        s = decoded;
        ev("Decoded URL-encoded JSON", "safe");
      }
    } catch {
      /* malformed % sequence — leave as is */
    }
  }

  // HTML-escaped: `&quot;` stands in for every quote.
  if (first !== '"' && s.includes("&quot;") && !s.includes('"')) {
    s = s
      .replace(/&quot;/g, '"')
      .replace(/&#0*34;|&#x0*22;/gi, '"')
      .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    ev("Decoded HTML-escaped JSON (&quot; …)", "safe");
  }

  // Markdown code fence (chat replies, READMEs): take the first fenced block
  // that holds an object/array; everything around it is prose.
  if (s.includes("```")) {
    FENCE_RE.lastIndex = 0;
    for (let m = FENCE_RE.exec(s); m; m = FENCE_RE.exec(s)) {
      if (/[{[]/.test(m[1])) {
        const outside = (s.slice(0, m.index) + s.slice(m.index + m[0].length)).trim();
        s = m[1];
        ev(outside ? "Extracted JSON from a Markdown code block (dropped the text around it)" : "Removed Markdown code fence", outside ? "lossy" : "safe");
        break;
      }
    }
  }

  // Double-encoded: the whole input is a JSON *string* whose content is JSON.
  const a = firstNonWs(s);
  const z = lastNonWs(s);
  if (z - a > 3 && s[a] === '"' && s[z] === '"' && /^"\s*[{[]/.test(s.slice(a, a + 40))) {
    const t = s.slice(a, z + 1);
    try {
      const inner: unknown = JSON.parse(t);
      if (typeof inner === "string" && /^\s*[{[]/.test(inner)) {
        s = inner;
        ev("Decoded double-encoded JSON (a string containing JSON)", "structural");
      }
    } catch {
      /* not a valid string literal — the parser will handle it */
    }
  }
  return s;
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

  s = unwrapEnvelopes(s, events);

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
