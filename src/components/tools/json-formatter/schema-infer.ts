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

const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function detectFormat(s: string): string | undefined {
  // Short-circuit: length bounds before regex tests.
  const n = s.length;
  if (n === 36 && UUID.test(s)) return "uuid";
  if (n === 10 && ISO_DATE.test(s)) return "date";
  if (n >= 16 && n <= 35 && ISO_DATE_TIME.test(s)) return "date-time";
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
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}

// ── Merge two schemas ────────────────────────────────────────────────────────

function sameType(a: JsonSchema, b: JsonSchema): boolean {
  return JSON.stringify(a.type) === JSON.stringify(b.type);
}

/**
 * Merge two schemas into the most specific schema that accepts every value
 * either of them accepted. Same-type schemas merge structurally; different
 * types fall through to a `oneOf`.
 */
function mergeTwo(a: JsonSchema, b: JsonSchema): JsonSchema {
  if (canon(a) === canon(b)) return a;
  if (!sameType(a, b)) return { oneOf: [a, b] };

  if (a.type === "object") {
    const aProps = a.properties ?? {};
    const bProps = b.properties ?? {};
    const allKeys = new Set([...Object.keys(aProps), ...Object.keys(bProps)]);
    const properties: Record<string, JsonSchema> = {};
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
      : (a.items ?? b.items ?? {});
    return { type: "array", items };
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

function inferInner(value: unknown): JsonSchema {
  if (value === null) return { type: "null" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer" }
      : { type: "number" };
  }
  if (typeof value === "string") {
    const fmt = detectFormat(value);
    return fmt ? { type: "string", format: fmt } : { type: "string" };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", items: {} };
    const sample = value.length > MAX_ARRAY_SAMPLE
      ? value.slice(0, MAX_ARRAY_SAMPLE)
      : value;
    return { type: "array", items: mergeAll(sample.map(inferInner)) };
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      properties[k] = inferInner(v);
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
export function inferJsonSchema(value: unknown): JsonSchema {
  return { $schema: SCHEMA_DRAFT, ...inferInner(value) };
}
