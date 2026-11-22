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
        case "integer":
          // Past i64: u64 still fits non-negative values below 2^64; beyond
          // that serde_json (without arbitrary_precision) only offers f64.
          if (ref.intRange === "uint64") return "u64";
          if (ref.intRange === "big") return "f64";
          return "i64";
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

// Strict + reserved keywords (2015–2024 editions). These can be used as raw
// identifiers (`r#type`).
const RUST_KEYWORDS = new Set([
  "as", "async", "await", "break", "const", "continue", "dyn",
  "else", "enum", "extern", "false", "fn", "for", "gen", "if", "impl", "in",
  "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
  "static", "struct", "trait", "true", "try",
  "type", "unsafe", "use", "where", "while", "yield",
  "abstract", "become", "box", "do", "final", "macro", "override", "priv",
  "typeof", "unsized", "virtual",
]);

// Keywords that are *not* allowed as raw identifiers (`r#self` is an error),
// plus the lone `_`. These get a trailing underscore instead.
const RUST_NO_RAW = new Set(["self", "Self", "super", "crate", "_"]);

function snake(s: string): string {
  // Convert camelCase / PascalCase / kebab-case → snake_case.
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

/**
 * Bare snake_case identifier for a key, or "" when nothing usable is left
 * (caller assigns `field_N`). Accented Latin is transliterated; a leading
 * digit gets a `_` prefix.
 */
function rustFieldBase(key: string): string {
  const ascii = key.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const n = snake(ascii)
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!n) return "";
  return /^[0-9]/.test(n) ? `_${n}` : n;
}

/**
 * Per-struct field identifiers. Keys that sanitise to the same name
 * (`userId` / `user_id` / `user-id`) get `_2`, `_3` — a key that already is
 * the snake_case name (`user_id`) claims it first, so it needs no rename;
 * unusable keys become `field_1`, `field_2`, …; keywords become raw
 * identifiers (`r#type`) or, where Rust forbids that (`self`, `crate`, …),
 * take a `_` suffix. Returns the bare name (for collision checks / rename)
 * and the source identifier.
 */
function rustFieldNames(keys: string[]): { bare: string; ident: string }[] {
  const withSuffix = (n: string) => (RUST_NO_RAW.has(n) ? `${n}_` : n);
  const bases = keys.map(rustFieldBase);
  const bares: string[] = new Array<string>(keys.length);
  const taken = new Set<string>();
  bases.forEach((b, i) => {
    if (b && b === keys[i] && !RUST_NO_RAW.has(b) && !taken.has(b)) {
      bares[i] = b;
      taken.add(b);
    }
  });
  let fallback = 0;
  bases.forEach((b, i) => {
    if (bares[i] !== undefined) return;
    let base = b;
    if (!base) {
      do fallback += 1; while (taken.has(`field_${fallback}`));
      base = `field_${fallback}`;
    }
    let bare = withSuffix(base);
    for (let n = 2; taken.has(bare); n++) bare = withSuffix(`${base}_${n}`);
    taken.add(bare);
    bares[i] = bare;
  });
  return bares.map((bare) => ({ bare, ident: RUST_KEYWORDS.has(bare) ? `r#${bare}` : bare }));
}

/** Rust string literal (`\u{…}` escapes — JSON's `\u0001` form isn't valid Rust). */
function rustStr(s: string): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if (ch === "\\") out += "\\\\";
    else if (ch === '"') out += '\\"';
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (cp >= 0xd800 && cp <= 0xdfff) out += "\\u{fffd}"; // lone surrogate: not a Rust char
    else if (cp < 0x20 || cp === 0x7f) out += `\\u{${cp.toString(16)}}`;
    else out += ch;
  }
  return `"${out}"`;
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
  // A primitive / untyped root declares no struct, so the import would be unused.
  if (collected.types.length > 0) lines.push(`use serde::{Deserialize, Serialize};`, "");

  if (collected.root.kind !== "object") {
    lines.push(`pub type ${collected.rootName} = ${refToRust(collected.root)};`, "");
  }

  for (const t of collected.types) {
    lines.push(`#[derive(${deriveList})]`);
    if (opts.denyUnknownFields) lines.push(`#[serde(deny_unknown_fields)]`);
    lines.push(`pub struct ${t.name} {`);
    const names = rustFieldNames(t.properties.map((p) => p.key));
    t.properties.forEach((p, idx) => {
      const { bare, ident } = names[idx];
      // serde strips `r#`, so only a differing bare name needs a rename.
      const rename = bare === p.key ? null : `rename = ${rustStr(p.key)}`;
      // refToRust already wraps nullable refs in Option<>; the field wrapper
      // only adds Option<> for optional (missing-key) semantics, never both.
      const innerType = refToRust(p.ref);
      const alreadyOption = innerType.startsWith("Option<");
      const wrapWithOption = p.optional && !alreadyOption;
      const rustType = wrapWithOption ? `Option<${innerType}>` : innerType;
      const isOption = alreadyOption || wrapWithOption;
      const attrs = [rename, isOption ? `skip_serializing_if = "Option::is_none"` : null]
        .filter((a): a is string => a !== null);
      if (p.ref.kind === "primitive" && p.ref.intRange === "big") {
        lines.push(`    // Exceeds 64-bit integers: f64 (precision may be lost).`);
      }
      if (attrs.length > 0) lines.push(`    #[serde(${attrs.join(", ")})]`);
      lines.push(`    pub ${ident}: ${rustType},`);
    });
    lines.push(`}`, "");
  }

  return lines.join("\n").trimEnd() + "\n";
}
