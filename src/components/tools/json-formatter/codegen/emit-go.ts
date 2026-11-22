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
        case "integer":
          // Beyond int64: uint64 still fits non-negative values below 2^64;
          // past that only json.Number keeps the digits (float64 would round).
          if (ref.intRange === "uint64") return "uint64";
          if (ref.intRange === "big") return "json.Number";
          return "int64";
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

/**
 * Exported Go field name for a JSON key, or "" when the key has no usable
 * ASCII letters/digits (the caller assigns a `FieldN` fallback). Accented
 * Latin is transliterated (`café` → `Cafe`); a leading digit gets a `Field`
 * prefix, since `1st` is not an identifier.
 */
function goFieldBase(key: string): string {
  const ascii = key.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const parts = ascii.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "";
  const name = parts.map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  return /^[0-9]/.test(name) ? `Field${name}` : name;
}

/**
 * Per-struct field names: distinct keys that sanitise to the same identifier
 * (`userId` / `user_id` / `user-id` → `UserId`) get `_2`, `_3` suffixes, and
 * keys with nothing usable become `Field1`, `Field2`, … The JSON tag keeps
 * the original key, so the mapping stays exact.
 */
function goFieldNames(keys: string[]): string[] {
  const taken = new Set<string>();
  let fallback = 0;
  return keys.map((key) => {
    let base = goFieldBase(key);
    if (!base) {
      do fallback += 1; while (taken.has(`Field${fallback}`));
      base = `Field${fallback}`;
    }
    let name = base;
    for (let i = 2; taken.has(name); i++) name = `${base}_${i}`;
    taken.add(name);
    return name;
  });
}

/**
 * encoding/json only honours a tag name made of letters, digits and
 * `!#$%&()*+-./:;<=>?@[]^_{|}~ ` — anything else (a quote, backslash, comma,
 * control char) makes it fall back to the Go field name. Mirrors `isValidTag`.
 */
function jsonTagNameUsable(name: string): boolean {
  if (name === "") return false;
  for (const ch of name) {
    if ("!#$%&()*+-./:;<=>?@[]^_{|}~ ".includes(ch)) continue;
    if (!/[\p{L}\p{N}]/u.test(ch)) return false;
  }
  return true;
}

/**
 * The struct tag literal. The tag value is itself a Go string literal, so the
 * key is quoted with escapes (`a"b` → `json:"a\"b"`). A backtick can't appear
 * in a raw string, so such tags switch to an interpreted literal.
 */
function goTag(value: string): string {
  const tag = `json:${JSON.stringify(value)}`;
  return tag.includes("`") ? JSON.stringify(tag) : `\`${tag}\``;
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

  // If root isn't an object, expose it as a type alias for ergonomics, under
  // the configured root name (`collect` reserved it).
  if (collected.root.kind !== "object") {
    lines.push(`type ${collected.rootName} = ${refToGo(collected.root)}`, "");
  }

  for (const t of collected.types) {
    lines.push(`type ${t.name} struct {`);
    const names = goFieldNames(t.properties.map((p) => p.key));
    const usedTags = new Set<string>();
    const originalKeys = new Set(t.properties.map((p) => p.key));
    t.properties.forEach((p, idx) => {
      const goName = names[idx];
      const base = baseGo(p.ref);
      // Optional → pointer-with-omitempty (idiomatic "may be absent").
      // Nullable → pointer (idiomatic "may be null"). Avoid double pointers
      // when a field is both, and skip pointers on `interface{}` (nil already
      // valid there).
      const needsPtr = (p.optional || !!p.ref.nullable) && base !== "interface{}";
      const goType = needsPtr ? `*${base}` : base;
      const omit = p.optional && omitOnOpt ? ",omitempty" : "";
      // Restyled tags can collide (`userId` / `user_id` both → `user_id`), and
      // encoding/json silently drops *both* fields of a duplicate tag. Real
      // keys win: a restyled tag that matches another key (or an earlier tag)
      // reverts to its own original key, which is unique within the object.
      let tagName = tagKey(p.key, tagStyle);
      if (tagName !== p.key && (originalKeys.has(tagName) || usedTags.has(tagName))) tagName = p.key;
      usedTags.add(tagName);
      // A lone `-` means "skip this field"; `-,` is the documented escape.
      const tagValue = tagName === "-" ? `-,${omit.slice(1)}` : `${tagName}${omit}`;
      const notes: string[] = [];
      if (tagName !== "-" && !jsonTagNameUsable(tagName)) {
        notes.push(`JSON key ${JSON.stringify(p.key)} can't be expressed as an encoding/json tag name`);
      }
      if (p.ref.kind === "primitive" && p.ref.intRange === "uint64") notes.push("exceeds int64");
      if (p.ref.kind === "primitive" && p.ref.intRange === "big") {
        notes.push("exceeds 64-bit integers; json.Number keeps the exact digits");
      }
      const comment = notes.length > 0 ? ` // ${notes.join("; ")}` : "";
      lines.push(`\t${goName} ${goType} ${goTag(tagValue)}${comment}`);
    });
    lines.push(`}`, "");
  }

  const body = lines.join("\n").trimEnd();
  const header = [`package ${packageName}`, ""];
  if (/\bjson\.Number\b/.test(body)) header.push(`import "encoding/json"`, "");
  return [...header, body].join("\n").trimEnd() + "\n";
}
