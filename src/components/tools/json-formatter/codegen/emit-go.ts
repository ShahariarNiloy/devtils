/**
 * Go emitter. Generates a single package's worth of struct types from a
 * collected schema IR. Optional fields use pointer-with-omitempty, the
 * idiomatic Go signal for "this might be absent".
 */

import type { CollectResult, TypeRef } from "./collect";

function refToGo(ref: TypeRef): string {
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

function pascal(s: string): string {
  const parts = s.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "Field";
  return parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

export function emitGo(collected: CollectResult, packageName = "main"): string {
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
      const goType = p.optional ? `*${refToGo(p.ref)}` : refToGo(p.ref);
      const omit = p.optional ? ",omitempty" : "";
      lines.push(`\t${goName} ${goType} \`json:"${p.key}${omit}"\``);
    }
    lines.push(`}`, "");
  }

  return lines.join("\n").trimEnd() + "\n";
}
