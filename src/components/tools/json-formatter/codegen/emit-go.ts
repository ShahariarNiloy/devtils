/**
 * Go emitter. Generates a single package's worth of struct types from a
 * collected schema IR. Optional fields use pointer-with-omitempty, the
 * idiomatic Go signal for "this might be absent".
 */

import type { CollectResult, TypeRef } from "./collect";

function baseGo(ref: TypeRef): string {
  switch (ref.kind) {
    case "object": return ref.name ?? "interface{}";
    case "array": return ref.item ? `[]${refToGo(ref.item)}` : "[]interface{}";
    case "primitive":
      switch (ref.prim) {
        case "string": return "string";
        case "integer": return "int64";
        case "number": return "float64";
        case "boolean": return "bool";
        default: return "interface{}";
      }
    case "string-format":
      // Stay in stdlib — RFC3339 lives in string form. Callers can swap to
      // time.Time / uuid.UUID by hand if they prefer those types.
      return "string";
    case "mixed":
    case "any":
    case "null":
      return "interface{}";
  }
}

function refToGo(ref: TypeRef): string {
  const base = baseGo(ref);
  // Nullable wraps the value in a pointer so JSON `null` round-trips cleanly.
  // For `interface{}` this is a no-op (nil is already a valid interface{}).
  return ref.nullable && base !== "interface{}" ? `*${base}` : base;
}

function pascal(s: string): string {
  const parts = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "Field";
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

export interface GoEmitOptions {
  packageName?: string;
  /** Add `,omitempty` to optional fields (default true). */
  omitemptyOnOptional?: boolean;
  /** Tag key style — `snake` (default), `camel`, or `original`. */
  jsonTagStyle?: "original" | "snake" | "camel";
}

function snake(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function camel(s: string): string {
  const parts = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return s;
  return parts
    .map((p, i) => (i === 0 ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1).toLowerCase()))
    .join("");
}

function tagKey(raw: string, style: "original" | "snake" | "camel"): string {
  if (style === "snake") return snake(raw);
  if (style === "camel") return camel(raw);
  return raw;
}

export function emitGo(
  collected: CollectResult,
  opts: GoEmitOptions | string = {},
): string {
  // String overload preserves the original `emitGo(collected, "pkgname")` API.
  const o: GoEmitOptions = typeof opts === "string" ? { packageName: opts } : opts;
  const packageName = o.packageName ?? "main";
  const omitOnOpt = o.omitemptyOnOptional ?? true;
  const tagStyle = o.jsonTagStyle ?? "original";

  const lines: string[] = [];
  lines.push(`package ${packageName}`, "");

  // If root isn't an object, expose it as a type alias for ergonomics.
  if (collected.root.kind !== "object") {
    lines.push(`type Root = ${refToGo(collected.root)}`, "");
  }

  for (const t of collected.types) {
    lines.push(`type ${t.name} struct {`);
    for (const p of t.properties) {
      const goName = pascal(p.key);
      const base = baseGo(p.ref);
      // Optional → pointer-with-omitempty (idiomatic "may be absent").
      // Nullable → pointer (idiomatic "may be null"). Avoid double pointers
      // when a field is both, and skip pointers on `interface{}` (nil already
      // valid there).
      const needsPtr = (p.optional || !!p.ref.nullable) && base !== "interface{}";
      const goType = needsPtr ? `*${base}` : base;
      const omit = p.optional && omitOnOpt ? ",omitempty" : "";
      const tagName = tagKey(p.key, tagStyle);
      lines.push(`\t${goName} ${goType} \`json:"${tagName}${omit}"\``);
    }
    lines.push(`}`, "");
  }

  return lines.join("\n").trimEnd() + "\n";
}
