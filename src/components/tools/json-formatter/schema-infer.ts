/**
 * JSON Schema (draft 2020-12 compatible) inference from a sample document.
 *
 * Design goals, in order of priority:
 *   1. Correctness on heterogeneous arrays (objects with different keys
 *      across the array must merge, not just become a giant `oneOf`).
 *   2. Speed on representative inputs. Walking 1000 user objects should be
 *      ~hundreds of ms at most. We dedupe schemas via a stable canonical
 *      string key so merge cost stays sub-quadratic.
 *   3. Reusability — this is the canonical IR for downstream codegen
 *      (TypeScript, Zod, Go, Python, Rust) and the mock-data generator.
 *
 * What we infer:
 *   - Primitive types (null, boolean, integer, number, string).
 *   - String formats: date-time, date, uri, email, uuid.
 *   - Array items, merging item schemas across the array.
 *   - Object properties, with `required` = intersection of keys across all
 *     observed sibling objects (so optional fields fall out automatically).
 *
 * What we explicitly don't do (yet):
 *   - Enum inference (would need frequency analysis).
 *   - Min/max bounds for numbers and strings.
 *   - Pattern inference.
 *   These are easy follow-ups once the IR proves itself in codegen.
 */

export type JsonSchemaType =
  | "null"
  | "boolean"
  | "integer"
  | "number"
  | "string"
  | "array"
  | "object";

export interface JsonSchema {
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  format?: string;
  /** Set when an array contained items whose schemas couldn't be merged. */
  oneOf?: JsonSchema[];
  /** Always present at root; identifies the spec. */
  $schema?: string;
  /**
   * Codegen-only (never emitted into a JSON Schema document — only present
   * when `inferJsonSchema` is called with `{ intRange: true }`): integers
   * outside the signed 64-bit range. `uint64` = above int64 but within
   * uint64; `big` = outside both, so no fixed-width integer type fits.
   */
  intRange?: IntRange;
}

export type IntRange = "uint64" | "big";

export interface InferOptions {
  /** Annotate integers that overflow int64 with `intRange` (codegen only). */
  intRange?: boolean;
}

const SCHEMA_DRAFT = "https://json-schema.org/draft/2020-12/schema";

/**
 * Sample at most this many items from a long array. The merge logic is
 * O(n × avg-schema-size); for 100k-element arrays the schema would still
 * stabilize after a few hundred samples, and the user can opt for full
 * coverage on smaller inputs.
 */
const MAX_ARRAY_SAMPLE = 500;

// ── String format detection ──────────────────────────────────────────────────
// Conservative — same posture as the smart-preview detectors: prefer no
// format hint over a misclassification.

// `date-time` is RFC 3339 `date-time`: seconds and a `Z` / `±hh:mm` offset are
// mandatory. Offset-less ("local") timestamps and minute-precision forms are
// left format-less: JSON Schema's `date-time` and Zod's `.datetime()` both
// reject them, so tagging them would emit a schema that fails its own sample.
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Calendar check — `2024-02-30` matches the regex but is not a date. */
function validYmd(y: string, m: string, d: string): boolean {
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function isDateTime(s: string): boolean {
  const m = ISO_DATE_TIME.exec(s);
  if (!m || !validYmd(m[1], m[2], m[3])) return false;
  if (Number(m[4]) > 23 || Number(m[5]) > 59 || Number(m[6]) > 59) return false;
  if (m[7] !== undefined && (Number(m[7]) > 23 || Number(m[8]) > 59)) return false;
  return true;
}

function isDate(s: string): boolean {
  const m = ISO_DATE.exec(s);
  return !!m && validYmd(m[1], m[2], m[3]);
}

function detectFormat(s: string): string | undefined {
  // Short-circuit: length bounds before regex tests.
  const n = s.length;
  if (n === 36 && UUID.test(s)) return "uuid";
  if (n === 10 && isDate(s)) return "date";
  if (n >= 20 && n <= 35 && isDateTime(s)) return "date-time";
  if (n >= 8 && (s.startsWith("http://") || s.startsWith("https://"))) {
    try {
      new URL(s);
      return "uri";
    } catch { /* not a URL */ }
  }
  if (n >= 5 && n <= 254 && EMAIL.test(s)) return "email";
  return undefined;
}

// ── Canonical key for dedup ──────────────────────────────────────────────────
// JSON.stringify with a stable key order — same schema → identical string.
// This is how we dedupe item schemas in arrays without comparing trees in
// O(N²) fashion. The replacer is a *function* (not an array): an array-style
// replacer filters keys at every nesting level, which silently drops nested
// schema differences and causes merge logic to collapse non-equivalent
// shapes into one.

function canon(schema: JsonSchema): string {
  return JSON.stringify(schema, (_key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const sorted = Object.create(null) as Record<string, unknown>;
      for (const k of Object.keys(value).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}

// ── Merge two schemas ────────────────────────────────────────────────────────

/**
 * "No information" sentinel — a schema with no fields was produced by either
 * an empty array (no items observed) or a path that found nothing
 * inferrable. Treating this as the identity element of `mergeTwo` is what
 * stops a single empty `[]` in a sample from collapsing the inferred element
 * type to `unknown`: an empty array genuinely tells us nothing about the
 * elements, so it should defer to any sibling that does.
 */
function isEmptySchema(s: JsonSchema): boolean {
  return Object.keys(s).length === 0;
}

/** The variants a schema stands for — a `oneOf` is flattened, anything else is itself. */
function variantsOf(s: JsonSchema): JsonSchema[] {
  if (s.oneOf && s.type === undefined) return s.oneOf.flatMap(variantsOf);
  return isEmptySchema(s) ? [] : [s];
}

/**
 * Variants of the same kind merge structurally instead of sitting side by
 * side in a `oneOf`. `integer` and `number` are one kind: `1` and `1.5` in the
 * same field is a number field, not "integer or number".
 */
function kindOf(s: JsonSchema): string {
  if (s.type === "integer" || s.type === "number") return "number";
  return typeof s.type === "string" ? s.type : canon(s);
}

const INT_RANGE_RANK: Record<IntRange, number> = { uint64: 1, big: 2 };

function widerIntRange(a?: IntRange, b?: IntRange): IntRange | undefined {
  if (!a) return b;
  if (!b) return a;
  return INT_RANGE_RANK[a] >= INT_RANGE_RANK[b] ? a : b;
}

/** Structural merge of two variants that share a kind (see `kindOf`). */
function mergeSameKind(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (canon(a) === canon(b)) return a;

  if (a.type === "object") {
    const aProps = a.properties ?? {};
    const bProps = b.properties ?? {};
    const allKeys = new Set([...Object.keys(aProps), ...Object.keys(bProps)]);
    const properties = propMap();
    for (const k of allKeys) {
      const av = aProps[k];
      const bv = bProps[k];
      if (av && bv) properties[k] = mergeTwo(av, bv);
      else properties[k] = av ?? bv ?? {};
    }
    // Required = intersection — a key is only required if every observed
    // object had it.
    const aReq = new Set(a.required ?? []);
    const bReq = new Set(b.required ?? []);
    const required = [...aReq].filter((k) => bReq.has(k));
    const out: JsonSchema = { type: "object", properties };
    if (required.length > 0) out.required = required;
    return out;
  }

  if (a.type === "array") {
    const items = a.items && b.items
      ? mergeTwo(a.items, b.items)
      : (a.items ?? b.items);
    return items && !isEmptySchema(items) ? { type: "array", items } : { type: "array" };
  }

  if (a.type === "integer" || a.type === "number") {
    // Widen: any fractional sample makes the whole field a number.
    if (a.type !== b.type) return { type: "number" };
    const intRange = widerIntRange(a.intRange, b.intRange);
    return intRange ? { type: a.type, intRange } : { type: a.type };
  }

  // For same-type primitives, prefer the wider format-less version when
  // formats differ (e.g. one string was a UUID, one wasn't).
  if (a.format && a.format === b.format) return a;
  if (a.format || b.format) {
    const out: JsonSchema = { ...a };
    delete out.format;
    return out;
  }
  return a;
}

/**
 * Merge two schemas into the most specific schema that accepts every value
 * either of them accepted. Both sides are flattened to their variants; each
 * variant folds into the existing variant of the same kind, so the result is
 * either one schema or a flat, duplicate-free `oneOf` with at most one
 * variant per kind (which keeps the variants mutually exclusive, as `oneOf`
 * requires).
 */
function mergeTwo(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (isEmptySchema(a)) return b;
  if (isEmptySchema(b)) return a;
  if (canon(a) === canon(b)) return a;

  const out: JsonSchema[] = [];
  for (const v of [...variantsOf(a), ...variantsOf(b)]) {
    const kind = kindOf(v);
    const i = out.findIndex((o) => kindOf(o) === kind);
    if (i === -1) out.push(v);
    else out[i] = mergeSameKind(out[i], v);
  }
  if (out.length === 0) return {};
  return out.length === 1 ? out[0] : { oneOf: out };
}

/**
 * Merge an array of schemas. Dedupes by canonical key first, then folds the
 * remaining unique schemas with `mergeTwo`. Linear in input size for the
 * common case where all items share a schema.
 */
function mergeAll(schemas: JsonSchema[]): JsonSchema {
  if (schemas.length === 0) return {};
  const seen = new Map<string, JsonSchema>();
  for (const s of schemas) {
    const key = canon(s);
    if (!seen.has(key)) seen.set(key, s);
  }
  const unique = [...seen.values()];
  if (unique.length === 1) return unique[0];
  return unique.reduce((acc, s) => mergeTwo(acc, s));
}

// ── Core inference ───────────────────────────────────────────────────────────

const INT64_LIMIT = 2 ** 63;
const UINT64_LIMIT = 2 ** 64;

/**
 * Own-property map that is safe for any key — a `{}` literal would turn a
 * `"__proto__"` key into a prototype swap and silently drop it.
 */
function propMap(): Record<string, JsonSchema> {
  return Object.create(null) as Record<string, JsonSchema>;
}

function inferInner(value: unknown, opts: InferOptions): JsonSchema {
  if (value === null) return { type: "null" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "number") {
    if (!Number.isInteger(value)) return { type: "number" };
    if (opts.intRange) {
      // Doubles can't hold 2^63 - 1 exactly (it parses as 2^63), so `>=`
      // is the honest bound for "does not fit int64".
      if (value >= INT64_LIMIT) {
        return { type: "integer", intRange: value < UINT64_LIMIT ? "uint64" : "big" };
      }
      if (value < -INT64_LIMIT) return { type: "integer", intRange: "big" };
    }
    return { type: "integer" };
  }
  if (typeof value === "string") {
    const fmt = detectFormat(value);
    return fmt ? { type: "string", format: fmt } : { type: "string" };
  }
  if (Array.isArray(value)) {
    // No items observed — leave items off so `mergeTwo`'s array branch picks
    // up sibling items rather than producing a `oneOf` against an empty
    // sub-schema (which would collapse to `unknown[]` in codegen).
    if (value.length === 0) return { type: "array" };
    const sample = value.length > MAX_ARRAY_SAMPLE
      ? value.slice(0, MAX_ARRAY_SAMPLE)
      : value;
    return { type: "array", items: mergeAll(sample.map((v) => inferInner(v, opts))) };
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const properties = propMap();
    const required: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      properties[k] = inferInner(v, opts);
      required.push(k);
    }
    const out: JsonSchema = { type: "object", properties };
    if (required.length > 0) out.required = required;
    return out;
  }
  return {};
}

/**
 * Top-level entry. Walks the value once and returns a draft-2020-12 schema
 * with the spec identifier attached. Pass the result straight to JSON
 * stringify for display, or to downstream codegen generators.
 */
export function inferJsonSchema(value: unknown, opts: InferOptions = {}): JsonSchema {
  return { $schema: SCHEMA_DRAFT, ...inferInner(value, opts) };
}
