/**
 * A JSON reader that keeps every number exactly as written, so generated
 * code never rounds `12345678901234567890` or `0.1000000000000000055`.
 * Strict JSON (what JSON.parse accepts); errors carry the position.
 */

/** A number, kept as its source text. */
export interface JsonNumber {
  readonly num: string;
}
export type JsonValue =
  | null
  | boolean
  | string
  | JsonNumber
  | JsonValue[]
  | JsonObject;
/** Entries keep source order and duplicate keys (last one wins when sent). */
export interface JsonObject {
  readonly entries: readonly (readonly [string, JsonValue])[];
}

export const isJsonNumber = (v: JsonValue): v is JsonNumber =>
  typeof v === "object" && v !== null && "num" in v;
export const isJsonObject = (v: JsonValue): v is JsonObject =>
  typeof v === "object" && v !== null && "entries" in v;

export class JsonSyntaxError extends Error {
  constructor(
    message: string,
    readonly at: number,
  ) {
    super(message);
  }
}

export function parseJson(text: string): JsonValue {
  let i = 0;
  const n = text.length;
  const ws = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) i++;
      else break;
    }
  };
  const fail = (what: string): never => {
    throw new JsonSyntaxError(
      i >= n
        ? `Unexpected end of JSON (expected ${what})`
        : `Expected ${what} at position ${i}`,
      i,
    );
  };
  const str = (): string => {
    i++; // opening quote
    let out = "";
    let start = i;
    while (i < n) {
      const c = text[i];
      if (c === '"') {
        out += text.slice(start, i);
        i++;
        return out;
      }
      if (c === "\\") {
        out += text.slice(start, i);
        const e = text[i + 1];
        if (e === "u") {
          const hex = text.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("four hex digits after \\u");
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
        } else {
          const map: Record<string, string> = {
            '"': '"',
            "\\": "\\",
            "/": "/",
            b: "\b",
            f: "\f",
            n: "\n",
            r: "\r",
            t: "\t",
          };
          const v = e === undefined ? undefined : map[e];
          if (v === undefined) fail("a valid escape");
          out += v;
          i += 2;
        }
        start = i;
        continue;
      }
      if (c.charCodeAt(0) < 0x20) fail("no control characters in a string");
      i++;
    }
    return fail('a closing "');
  };
  const value = (): JsonValue => {
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      const entries: [string, JsonValue][] = [];
      ws();
      if (text[i] === "}") {
        i++;
        return { entries };
      }
      for (;;) {
        ws();
        if (text[i] !== '"') fail("a property name");
        const k = str();
        ws();
        if (text[i] !== ":") fail('":"');
        i++;
        entries.push([k, value()]);
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return { entries };
        }
        fail('"," or "}"');
      }
    }
    if (c === "[") {
      i++;
      const arr: JsonValue[] = [];
      ws();
      if (text[i] === "]") {
        i++;
        return arr;
      }
      for (;;) {
        arr.push(value());
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return arr;
        }
        fail('"," or "]"');
      }
    }
    if (c === '"') return str();
    if (text.startsWith("true", i)) {
      i += 4;
      return true;
    }
    if (text.startsWith("false", i)) {
      i += 5;
      return false;
    }
    if (text.startsWith("null", i)) {
      i += 4;
      return null;
    }
    const m = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    m.lastIndex = i;
    const hit = m.exec(text);
    if (hit && hit[0] !== "-") {
      i += hit[0].length;
      return { num: hit[0] };
    }
    return fail("a value");
  };
  const v = value();
  ws();
  if (i < n) fail("the end of the JSON");
  return v;
}

/**
 * True when a double holds the number exactly. `bigInts`: the target has
 * arbitrary-size integers (Python), so only decimals can lose digits.
 */
export function numberIsSafe(raw: string, bigInts = false): boolean {
  if (/^-?\d+$/.test(raw)) return bigInts || Number.isSafeInteger(Number(raw));
  const digits = raw
    .replace(/^-/, "")
    .replace(/[eE].*$/, "")
    .replace(".", "")
    .replace(/^0+/, "");
  return digits.replace(/0+$/, "").length <= 15;
}

/** Any number in the value that a double can't hold exactly. */
export function hasUnsafeNumber(v: JsonValue, bigInts = false): boolean {
  if (v === null || typeof v !== "object") return false;
  if (isJsonNumber(v)) return !numberIsSafe(v.num, bigInts);
  if (Array.isArray(v)) return v.some((x) => hasUnsafeNumber(x, bigInts));
  return v.entries.some(([, x]) => hasUnsafeNumber(x, bigInts));
}

/** Compact JSON text, numbers exactly as written. */
export function jsonCompact(v: JsonValue): string {
  if (v === null) return "null";
  if (typeof v === "boolean") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (isJsonNumber(v)) return v.num;
  if (Array.isArray(v)) return `[${v.map(jsonCompact).join(",")}]`;
  return `{${v.entries.map(([k, x]) => `${JSON.stringify(k)}:${jsonCompact(x)}`).join(",")}}`;
}

/** Literal syntax for one target language. */
export interface LiteralStyle {
  str: (s: string) => string;
  key: (k: string) => string;
  nul: string;
  t: string;
  f: string;
  /** Array brackets and object brackets. */
  arr: [string, string];
  obj: [string, string];
  /** Between key and value. */
  sep: string;
  /** Spaces per level. */
  indent: number;
  /** Comma after the last item (JS, Python, PHP); never in JSON. */
  trailing: boolean;
}

export const JSON_STYLE: LiteralStyle = {
  str: (s) => JSON.stringify(s),
  key: (k) => JSON.stringify(k),
  nul: "null",
  t: "true",
  f: "false",
  arr: ["[", "]"],
  obj: ["{", "}"],
  sep: ": ",
  indent: 2,
  trailing: false,
};

/** Pretty-print a value as a literal in some language (JS, Python, PHP…). */
export function literal(v: JsonValue, style: LiteralStyle, depth = 0): string {
  if (v === null) return style.nul;
  if (typeof v === "boolean") return v ? style.t : style.f;
  if (typeof v === "string") return style.str(v);
  if (isJsonNumber(v)) return v.num;
  const pad = " ".repeat((depth + 1) * style.indent);
  const end = " ".repeat(depth * style.indent);
  const last = style.trailing ? "," : "";
  if (Array.isArray(v)) {
    if (!v.length) return style.arr[0] + style.arr[1];
    return `${style.arr[0]}\n${v.map((x) => pad + literal(x, style, depth + 1)).join(",\n")}${last}\n${end}${style.arr[1]}`;
  }
  if (!v.entries.length) return style.obj[0] + style.obj[1];
  const rows = v.entries.map(
    ([k, x]) =>
      `${pad}${style.key(k)}${style.sep}${literal(x, style, depth + 1)}`,
  );
  return `${style.obj[0]}\n${rows.join(",\n")}${last}\n${end}${style.obj[1]}`;
}
