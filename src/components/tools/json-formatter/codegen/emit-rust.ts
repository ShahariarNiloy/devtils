/**
 * Rust emitter. Uses serde derives plus a small set of stdlib types. We do
 * not pull in chrono/uuid crates — the consumer can swap String → DateTime
 * by hand if they want richer types. Optional fields use Option<T> and
 * skip_serializing_if so JSON round-trips cleanly.
 */

import type { CollectResult, TypeRef } from "./collect";

function baseRust(ref: TypeRef): string {
  switch (ref.kind) {
    case "object": return ref.name ?? "serde_json::Value";
    case "array": return ref.item ? `Vec<${refToRust(ref.item)}>` : "Vec<serde_json::Value>";
    case "primitive":
      switch (ref.prim) {
        case "string": return "String";
        case "integer": return "i64";
        case "number": return "f64";
        case "boolean": return "bool";
        default: return "serde_json::Value";
      }
    case "string-format":
      // Plain String — explicit choice over chrono/uuid to keep the output
      // free of external crate requirements. Callers can swap as needed.
      return "String";
    case "mixed":
    case "any":
    case "null":
      return "serde_json::Value";
  }
}

function refToRust(ref: TypeRef): string {
  const base = baseRust(ref);
  // serde_json::Value already represents JSON null, no Option<> needed.
  return ref.nullable && base !== "serde_json::Value" ? `Option<${base}>` : base;
}

const RUST_KEYWORDS = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "dyn",
  "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
  "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
  "self", "Self", "static", "struct", "super", "trait", "true", "try",
  "type", "unsafe", "use", "where", "while", "yield",
]);

function safeIdent(s: string): string {
  let n = s.replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z_]/.test(n)) n = `_${n}`;
  if (RUST_KEYWORDS.has(n)) n = `r#${n}`;
  return n;
}

function isSnakeCase(s: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(s);
}

function snake(s: string): string {
  // Convert camelCase / PascalCase / kebab-case → snake_case.
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export interface RustEmitOptions {
  /** Extra trait names to add to the derive list (e.g. `Default`, `PartialEq`). */
  extraDerives?: string[];
  /** Add `#[serde(deny_unknown_fields)]` on each struct. */
  denyUnknownFields?: boolean;
}

const DEFAULT_DERIVES = ["Serialize", "Deserialize", "Debug", "Clone"];

export function emitRust(
  collected: CollectResult,
  opts: RustEmitOptions = {},
): string {
  const extra = opts.extraDerives ?? [];
  const derives = [...DEFAULT_DERIVES, ...extra];
  const deriveList = derives.join(", ");

  const lines: string[] = [];
  lines.push(`use serde::{Deserialize, Serialize};`, "");

  if (collected.root.kind !== "object") {
    lines.push(`pub type Root = ${refToRust(collected.root)};`, "");
  }

  for (const t of collected.types) {
    lines.push(`#[derive(${deriveList})]`);
    if (opts.denyUnknownFields) lines.push(`#[serde(deny_unknown_fields)]`);
    lines.push(`pub struct ${t.name} {`);
    for (const p of t.properties) {
      const fieldName = isSnakeCase(p.key) ? p.key : snake(p.key);
      const safeField = safeIdent(fieldName);
      const renameAttr = safeField === p.key
        ? null
        : `#[serde(rename = "${p.key.replace(/"/g, '\\"')}")]`;
      // refToRust already wraps nullable refs in Option<>; the field wrapper
      // only adds Option<> for optional (missing-key) semantics, never both.
      const innerType = refToRust(p.ref);
      const alreadyOption = innerType.startsWith("Option<");
      const wrapWithOption = p.optional && !alreadyOption;
      const rustType = wrapWithOption ? `Option<${innerType}>` : innerType;
      const isOption = alreadyOption || wrapWithOption;
      if (isOption) {
        if (renameAttr) {
          lines.push(`    #[serde(rename = "${p.key.replace(/"/g, '\\"')}", skip_serializing_if = "Option::is_none")]`);
        } else {
          lines.push(`    #[serde(skip_serializing_if = "Option::is_none")]`);
        }
        lines.push(`    pub ${safeField}: ${rustType},`);
      } else {
        if (renameAttr) lines.push(`    ${renameAttr}`);
        lines.push(`    pub ${safeField}: ${rustType},`);
      }
    }
    lines.push(`}`, "");
  }

  return lines.join("\n").trimEnd() + "\n";
}
