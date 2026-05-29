/**
 * TypeScript emitter. Generates `export interface` declarations from the
 * collected schema IR. Compared with the previous inline implementation, this
 * gives us:
 *   - Named subtypes with structural dedup (no more pyramids of anonymous
 *     nested interfaces).
 *   - Intersection-based required keys at every depth, not just the top
 *     level of a root array.
 *   - Sibling-merged union types (so a field that's `null` in one item and
 *     `"x"` in another becomes `string | null`, not `null`).
 *   - String formats (`date-time`, `uuid`, `email`, `uri`, `date`) surface
 *     as `@format` JSDoc comments. We keep the TS type as `string` rather
 *     than reaching for `Date`/branded types so the output stays drop-in.
 */

import type { CollectResult, TypeRef } from "./collect";

export interface TypeScriptEmitOptions {
  /** `interface` (default) or `type` aliases. */
  declarationStyle?: "interface" | "type";
  /** Mark every property `readonly`. */
  readonly?: boolean;
  /** Children-first ordering (default true). Root-first when false. */
  childrenFirst?: boolean;
  /** Emit `export` on declarations (default true). */
  exportDeclarations?: boolean;
}

/** Resolve a TypeRef to its TS type expression, without the nullable wrap. */
function baseType(ref: TypeRef): string {
  switch (ref.kind) {
    case "object": return ref.name ?? "Record<string, unknown>";
    case "array": {
      if (!ref.item) return "unknown[]";
      const inner = refToTs(ref.item);
      // Wrap unions in parens so `string | null[]` reads as
      // `(string | null)[]`, not `string | (null[])`.
      return inner.includes("|") ? `(${inner})[]` : `${inner}[]`;
    }
    case "primitive":
      switch (ref.prim) {
        case "string": return "string";
        case "integer":
        case "number": return "number";
        case "boolean": return "boolean";
        default: return "unknown";
      }
    case "string-format":
      return "string";
    case "mixed":
    case "any":
      return "unknown";
    case "null":
      return "null";
  }
}

/** Resolve a TypeRef to its TS type expression, applying nullable. */
function refToTs(ref: TypeRef): string {
  const base = baseType(ref);
  return ref.nullable ? `${base} | null` : base;
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function safePropKey(key: string): string {
  return IDENT.test(key) ? key : JSON.stringify(key);
}

/** Pick up format hints carried on string-format refs and surface them. */
function formatTag(ref: TypeRef): string | null {
  if (ref.kind === "string-format" && ref.format) return ref.format;
  return null;
}

export function emitTypeScript(
  collected: CollectResult,
  opts: TypeScriptEmitOptions = {},
): string {
  const declStyle = opts.declarationStyle ?? "interface";
  const useReadonly = !!opts.readonly;
  const childrenFirst = opts.childrenFirst ?? true;
  const useExport = opts.exportDeclarations ?? true;

  const blocks: string[] = [];

  // `collect` walks in pre-order (parent before subtypes); reversing yields a
  // post-order layout where every referenced type is declared above its user.
  const ordered = childrenFirst
    ? [...collected.types].reverse()
    : [...collected.types];

  const exp = useExport ? "export " : "";
  const readonlyPrefix = useReadonly ? "readonly " : "";

  for (const t of ordered) {
    if (t.properties.length === 0) {
      // An empty `interface {}` accepts every non-nullish value — almost
      // never what the user means. Use a type alias for empty shapes.
      blocks.push(`${exp}type ${t.name} = Record<string, never>;`);
      continue;
    }

    const lines: string[] = [];
    const body: string[] = [];
    for (const p of t.properties) {
      const fmt = formatTag(p.ref);
      if (fmt) body.push(`  /** @format ${fmt} */`);
      const opt = p.optional ? "?" : "";
      body.push(`  ${readonlyPrefix}${safePropKey(p.key)}${opt}: ${refToTs(p.ref)};`);
    }

    if (declStyle === "type") {
      lines.push(`${exp}type ${t.name} = {`);
      lines.push(...body);
      lines.push(`};`);
    } else {
      lines.push(`${exp}interface ${t.name} {`);
      lines.push(...body);
      lines.push(`}`);
    }
    blocks.push(lines.join("\n"));
  }

  // Expose the root as a type alias when it isn't itself a named object — keeps
  // the emitter's output addressable as `Root` regardless of input shape.
  if (collected.root.kind !== "object") {
    blocks.push(`${exp}type Root = ${refToTs(collected.root)};`);
  }

  return blocks.join("\n\n") + "\n";
}
