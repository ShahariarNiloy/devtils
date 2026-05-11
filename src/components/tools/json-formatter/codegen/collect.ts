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
}

// ── Identifier hygiene ───────────────────────────────────────────────────────

function pascalCase(s: string): string {
  const parts = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "Item";
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, "");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `T_${cleaned}`;
}

// ── Canonical key (for dedup) ────────────────────────────────────────────────

function canon(schema: JsonSchema): string {
  return JSON.stringify(schema, Object.keys(schema).sort());
}

// ── Collector ────────────────────────────────────────────────────────────────

interface Collector {
  byHash: Map<string, CollectedType>;
  takenNames: Set<string>;
  order: CollectedType[];
}

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
    // Collapse oneOf to a "mixed" placeholder for codegen; emitters map this
    // to interface{} / Any / serde_json::Value. Each variant is still walked
    // so its nested objects get registered (useful if someone references
    // them from elsewhere in the schema).
    schema.oneOf.forEach((v, i) => refFor(c, v, `${hint}Variant${i + 1}`));
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
      const propRef = refFor(c, propSchema, `${name}${pascalCase(propKey)}`);
      entry.properties.push({ key: propKey, ref: propRef, optional: !required.has(propKey) });
    }
    return { kind: "object", name };
  }
  if (t === "array") {
    const items = schema.items ?? {};
    return { kind: "array", item: refFor(c, items, `${hint}Item`) };
  }
  if (t === "string") {
    return schema.format
      ? { kind: "string-format", format: schema.format }
      : { kind: "primitive", prim: "string" };
  }
  if (t === "integer") return { kind: "primitive", prim: "integer" };
  if (t === "number") return { kind: "primitive", prim: "number" };
  if (t === "boolean") return { kind: "primitive", prim: "boolean" };
  if (t === "null") return { kind: "null" };
  return { kind: "any" };
}

export function collect(schema: JsonSchema, rootName = "Root"): CollectResult {
  const c: Collector = { byHash: new Map(), takenNames: new Set(), order: [] };
  const root = refFor(c, schema, rootName);
  return { types: c.order, root };
}
