/**
 * Post-processing for the inferred JSON Schema (pure, no React): title,
 * required lists and `additionalProperties: false`.
 */

export interface SchemaPostOptions {
  /** Root `title`; empty string omits it. */
  title: string;
  /** Keep inferred `required` lists (false strips them everywhere). */
  required: boolean;
  /** Add `additionalProperties: false` to every object schema. */
  noExtraKeys: boolean;
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type JsonObject = { [k: string]: Json };

function isObject(v: Json | undefined): v is JsonObject {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Keys whose values are data, not sub-schemas — never rewritten. */
const DATA_KEYS = new Set(["enum", "const", "examples", "default", "required"]);

function isObjectSchema(s: JsonObject): boolean {
  const t = s.type;
  return t === "object" || (Array.isArray(t) && t.includes("object")) || isObject(s.properties);
}

function walk(node: Json, opts: SchemaPostOptions): Json {
  if (Array.isArray(node)) return node.map((n) => walk(n, opts));
  if (!isObject(node)) return node;
  const out: JsonObject = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "required" && !opts.required) continue;
    if (DATA_KEYS.has(k)) {
      out[k] = v;
      continue;
    }
    if (k === "properties" && isObject(v)) {
      const props: JsonObject = {};
      for (const [name, sub] of Object.entries(v)) props[name] = walk(sub, opts);
      out[k] = props;
      continue;
    }
    out[k] = walk(v, opts);
  }
  if (opts.noExtraKeys && isObjectSchema(node) && !("additionalProperties" in out)) {
    out.additionalProperties = false;
  }
  return out;
}

/** Apply the options to emitted schema text; returns pretty JSON. */
export function postProcessSchema(text: string, opts: SchemaPostOptions): string {
  const parsed = JSON.parse(text) as Json;
  const body = walk(parsed, opts);
  if (!isObject(body)) return JSON.stringify(body, null, 2);
  const title = opts.title.trim();
  const ordered: JsonObject = {};
  if ("$schema" in body) ordered.$schema = body.$schema;
  if (title) ordered.title = title;
  for (const [k, v] of Object.entries(body)) {
    if (k !== "$schema" && k !== "title") ordered[k] = v;
  }
  return JSON.stringify(ordered, null, 2);
}

/**
 * First key in `value` that an `additionalProperties: false` schema would
 * reject, as a dotted path — or null. Complements the shared validator,
 * which doesn't check additionalProperties.
 */
export function findUnexpectedKey(value: unknown, schema: unknown, path = ""): string | null {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return null;
  const s = schema as Record<string, unknown>;
  if (Array.isArray(value)) {
    if (s.items) {
      for (let i = 0; i < value.length; i++) {
        const hit = findUnexpectedKey(value[i], s.items, `${path}[${i}]`);
        if (hit) return hit;
      }
    }
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  const props = (s.properties && typeof s.properties === "object" ? s.properties : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const p = path ? `${path}.${k}` : k;
    if (!(k in props)) {
      if (s.additionalProperties === false) return p;
      continue;
    }
    const hit = findUnexpectedKey(v, props[k], p);
    if (hit) return hit;
  }
  return null;
}
