/**
 * Shared collection step for codegen. Walks a JsonSchema once and produces
 * a flat list of named object types, deduped by canonical shape. The same
 * collection drives Go / Python / Rust emitters — each emitter is then a
 * pure string-building pass over `collected.types`.
 *
 * Performance:
 *  - Canonical-key dedup means duplicate shapes only get one entry.
 *  - Each type's property refs are computed during the same walk that
 *    registered the type, so emitters never re-walk the schema.
 *  - O(n) in the size of the schema tree.
 */

import type { JsonSchema } from "../schema-infer";

export interface TypeRef {
  kind:
    | "object"
    | "array"
    | "primitive"
    | "string-format"
    | "mixed"
    | "any"
    | "null";
  /** For object refs, the registered type name. */
  name?: string;
  /** For arrays, the item TypeRef (nested). */
  item?: TypeRef;
  /** For primitives: "string" | "integer" | "number" | "boolean" | "null". */
  prim?: string;
  /** For string formats: "date-time" | "date" | "uri" | "email" | "uuid". */
  format?: string;
  /**
   * True when the schema merged this type with `null` (e.g. some siblings
   * had the field as `"x"`, others as `null`). Emitters render this as
   * `T | null` / `*T` / `Option<T>` / `Optional[T]`. Distinct from
   * `CollectedProperty.optional`, which means the key itself may be absent.
   */
  nullable?: boolean;
  /**
   * Integer primitives only: set when a sample overflowed int64 (see
   * `JsonSchema.intRange`). Fixed-width emitters (Go, Rust) widen to
   * `uint64` / an arbitrary-precision or float type.
   */
  intRange?: "uint64" | "big";
}

export interface CollectedProperty {
  key: string;
  ref: TypeRef;
  optional: boolean;
}

export interface CollectedType {
  name: string;
  /** Property list with resolved type refs, ordered as in the source. */
  properties: CollectedProperty[];
}

export interface CollectResult {
  /** Insertion-ordered object types: parents may reference children by name. */
  types: CollectedType[];
  /** TypeRef for the document root — could name a struct or be a builtin. */
  root: TypeRef;
  /**
   * Name for the root declaration. For object roots it is `root.name`; for
   * array / primitive roots it names the alias (`type Root = Item[]`) and is
   * reserved before the walk, so no collected type can take it.
   */
  rootName: string;
}

// ── Identifier hygiene ───────────────────────────────────────────────────────

function pascalCase(s: string): string {
  const parts = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "Item";
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

/**
 * Heuristic English singularization for plural property keys: `users` →
 * `User`, `categories` → `Category`, `addresses` → `Address`. Words that
 * don't have a clean plural inflection (`data`, `series`, `status`) are
 * returned unchanged so the caller can fall back to `${hint}Item` rather
 * than producing `Seri` / `Statu`. Conservative on purpose — better to keep
 * a weird-looking item suffix than to invent a wrong singular.
 */
/**
 * Words whose form is identical in singular and plural, or whose plural is
 * irregular enough that the suffix rules below would invent a wrong singular
 * (`series` → `Sery`, `species` → `Specie`). Listed in lower case; matched
 * case-insensitively. Returning them unchanged makes the caller fall back to
 * the `${hint}Item` form.
 */
const SINGULARIZE_SKIP = new Set([
  "series", "species", "news", "means",
  "data", "metadata", "schema", "media",
]);

function singularize(s: string): string {
  if (s.length <= 2) return s;
  const lower = s.toLowerCase();
  if (SINGULARIZE_SKIP.has(lower)) return s;

  // categories → category, parties → party
  if (lower.endsWith("ies") && s.length > 3) {
    return s.slice(0, -3) + "y";
  }

  // boxes → box, bushes → bush, addresses → address, watches → watch
  if (lower.endsWith("es") && s.length > 3) {
    const stemLower = lower.slice(0, -2);
    if (
      stemLower.endsWith("s") ||
      stemLower.endsWith("x") ||
      stemLower.endsWith("z") ||
      stemLower.endsWith("ch") ||
      stemLower.endsWith("sh")
    ) {
      return s.slice(0, -2);
    }
    // series, species — stem doesn't match -es pattern, leave alone.
  }

  // users → user. Exclude common false positives: status, analysis, news.
  if (
    lower.endsWith("s") &&
    !lower.endsWith("ss") &&
    !lower.endsWith("us") &&
    !lower.endsWith("is")
  ) {
    return s.slice(0, -1);
  }

  return s;
}

function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, "");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `T_${cleaned}`;
}

// ── Canonical key (for dedup) ────────────────────────────────────────────────
// Function-form replacer for stable key ordering at every nesting level. An
// array-form replacer would filter keys not in the top-level key list out of
// deeper objects, collapsing structurally distinct shapes into one hash.

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

// ── Collector ────────────────────────────────────────────────────────────────

interface Collector {
  byHash: Map<string, CollectedType>;
  takenNames: Set<string>;
  order: CollectedType[];
}

/**
 * Type names no emitter may declare: keywords that are PascalCase (`Self` in
 * Rust; `None` / `True` / `False` in Python) and the builtin / imported names
 * the emitters themselves reference (`String`, `Vec`, `Option` in Rust;
 * `Any`, `Optional`, `UUID`, … in Python; `Record` in TypeScript). A key like
 * `"string": {…}` would otherwise declare `struct String` and silently
 * re-point every `String` field at it.
 */
const RESERVED_TYPE_NAMES = [
  "Self", "None", "True", "False",
  "String", "Vec", "Option", "Box", "Result", "Some", "Ok", "Err",
  "Serialize", "Deserialize",
  "Any", "Optional", "TypedDict", "BaseModel", "Field", "UUID",
  "Record", "Array", "Object", "Date",
];

function uniquify(c: Collector, base: string): string {
  const baseName = sanitizeName(pascalCase(base) || "Item");
  if (!c.takenNames.has(baseName)) {
    c.takenNames.add(baseName);
    return baseName;
  }
  let i = 2;
  while (c.takenNames.has(`${baseName}${i}`)) i += 1;
  const name = `${baseName}${i}`;
  c.takenNames.add(name);
  return name;
}

function refFor(c: Collector, schema: JsonSchema, hint: string): TypeRef {
  if (schema.oneOf && schema.oneOf.length > 0) {
    // `inferJsonSchema` emits flat oneOfs, but flatten defensively so a
    // hand-built nested oneOf still resolves the same way.
    const flat: JsonSchema[] = [];
    const walk = (s: JsonSchema) => {
      if (s.oneOf && s.type === undefined) s.oneOf.forEach(walk);
      else flat.push(s);
    };
    walk(schema);
    const nonNull = flat.filter((v) => v.type !== "null");
    const hasNull = nonNull.length < flat.length;
    // Nullable-T: exactly one non-null variant plus `null` (a field that's
    // "string sometimes, null sometimes"). Emitting the inner type with a
    // `nullable` flag is strictly more useful than a `mixed` placeholder.
    if (nonNull.length === 1) {
      const ref = refFor(c, nonNull[0], hint);
      return hasNull ? { ...ref, nullable: true } : ref;
    }
    if (nonNull.length === 0) return { kind: "null" };
    // Genuinely mixed: emitters map this to interface{} / Any / unknown /
    // serde_json::Value. Variants are deliberately *not* registered as named
    // types — nothing would reference them, so they'd only be orphans.
    return { kind: "mixed" };
  }
  const t = schema.type;
  if (t === "object") {
    const key = canon(schema);
    const existing = c.byHash.get(key);
    if (existing) return { kind: "object", name: existing.name };

    const name = uniquify(c, hint);
    const entry: CollectedType = { name, properties: [] };
    // Register *before* recursing so any back-reference (defensive — current
    // schemas don't loop) resolves to this name.
    c.byHash.set(key, entry);
    c.order.push(entry);

    const required = new Set(schema.required ?? []);
    const props = schema.properties ?? {};
    for (const [propKey, propSchema] of Object.entries(props)) {
      // Hint is just the property key: `address` → `Address`, not
      // `RootAddress`. `uniquify` handles real name collisions (two
      // structurally distinct `address` shapes become `Address` /
      // `Address2`); the prefixed form was over-eager disambiguation.
      const propRef = refFor(c, propSchema, pascalCase(propKey));
      entry.properties.push({ key: propKey, ref: propRef, optional: !required.has(propKey) });
    }
    return { kind: "object", name };
  }
  if (t === "array") {
    const items = schema.items ?? {};
    // Prefer the singular form when the hint cleanly inflects (users → User);
    // fall back to `${hint}Item` for ambiguous cases (data → DataItem) so we
    // never invent a wrong-looking singular like "Datum"/"Statu".
    const singular = singularize(hint);
    const itemHint = singular !== hint ? singular : `${hint}Item`;
    return { kind: "array", item: refFor(c, items, itemHint) };
  }
  if (t === "string") {
    return schema.format
      ? { kind: "string-format", format: schema.format }
      : { kind: "primitive", prim: "string" };
  }
  if (t === "integer") {
    return schema.intRange
      ? { kind: "primitive", prim: "integer", intRange: schema.intRange }
      : { kind: "primitive", prim: "integer" };
  }
  if (t === "number") return { kind: "primitive", prim: "number" };
  if (t === "boolean") return { kind: "primitive", prim: "boolean" };
  if (t === "null") return { kind: "null" };
  return { kind: "any" };
}

function isObjectRoot(schema: JsonSchema): boolean {
  return schema.type === "object" && !schema.oneOf;
}

export function collect(schema: JsonSchema, rootName = "Root"): CollectResult {
  const c: Collector = {
    byHash: new Map(),
    takenNames: new Set(RESERVED_TYPE_NAMES),
    order: [],
  };
  if (isObjectRoot(schema)) {
    // First registration, so the struct gets `rootName` itself (unless that
    // is a reserved name, in which case it is suffixed like any collision).
    const root = refFor(c, schema, rootName);
    return { types: c.order, root, rootName: root.name ?? rootName };
  }
  // Array / primitive root: claim the alias name up front so items can't
  // collide with it (`Root = RootItem[]` beside a `RootItem` struct, or
  // `User = User[]`).
  const alias = uniquify(c, rootName);
  const root = refFor(c, schema, alias);
  return { types: c.order, root, rootName: alias };
}
