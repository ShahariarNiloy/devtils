/**
 * Zod emitter. Generates a Zod v3+ schema graph from the collected schema IR
 * and pairs it with `z.infer` type aliases so the output is drop-in usable.
 * Built on the same IR as Go/Python/Rust/TypeScript, so nested optionals,
 * sibling-merged unions, and structural dedup all work consistently here.
 */

import type { CollectResult, TypeRef } from "./collect";

export interface ZodEmitOptions {
  /** Root constant name; PascalCase of this names the inferred type. */
  rootName?: string;
  /** Add `.strict()` to every `z.object(...)` so unknown keys fail validation. */
  strict?: boolean;
  /** Format string format-hints as Zod refinements (`.email()`, `.uuid()`, `.datetime()`). */
  applyFormatRefinements?: boolean;
}

function pascal(s: string): string {
  if (!s) return "Root";
  return s[0].toUpperCase() + s.slice(1);
}

function baseZod(ref: TypeRef, refinements: boolean): string {
  switch (ref.kind) {
    case "object": return ref.name ? `${ref.name}Schema` : "z.record(z.string(), z.unknown())";
    case "array": {
      if (!ref.item) return "z.array(z.unknown())";
      return `z.array(${refToZod(ref.item, refinements)})`;
    }
    case "primitive":
      switch (ref.prim) {
        case "string": return "z.string()";
        case "integer": return "z.number().int()";
        case "number": return "z.number()";
        case "boolean": return "z.boolean()";
        default: return "z.unknown()";
      }
    case "string-format":
      if (!refinements) return "z.string()";
      switch (ref.format) {
        case "email": return "z.string().email()";
        case "uri": return "z.string().url()";
        case "uuid": return "z.string().uuid()";
        case "date-time": return "z.string().datetime({ offset: true })";
        case "date": return "z.string().date()";
        default: return "z.string()";
      }
    case "mixed":
    case "any":
      return "z.unknown()";
    case "null":
      return "z.null()";
  }
}

function refToZod(ref: TypeRef, refinements: boolean): string {
  const base = baseZod(ref, refinements);
  return ref.nullable ? `${base}.nullable()` : base;
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function safeKey(k: string): string {
  return IDENT.test(k) ? k : JSON.stringify(k);
}

export function emitZod(
  collected: CollectResult,
  opts: ZodEmitOptions = {},
): string {
  const rootName = opts.rootName ?? "root";
  const strict = !!opts.strict;
  const refinements = opts.applyFormatRefinements ?? true;

  // Order children before parents so each schema reference resolves at
  // declaration time (Zod schemas are eager values, unlike TS interfaces).
  const ordered = [...collected.types].reverse();

  const blocks: string[] = [];

  for (const t of ordered) {
    const lines: string[] = [`export const ${t.name}Schema = z.object({`];
    if (t.properties.length === 0) {
      lines[0] = `export const ${t.name}Schema = z.object({});`;
    } else {
      for (const p of t.properties) {
        const value = refToZod(p.ref, refinements);
        const suffix = p.optional ? ".optional()" : "";
        lines.push(`  ${safeKey(p.key)}: ${value}${suffix},`);
      }
      lines.push(`})${strict ? ".strict()" : ""};`);
    }
    blocks.push(lines.join("\n"));
    blocks.push(`export type ${t.name} = z.infer<typeof ${t.name}Schema>;`);
  }

  const rootConst = rootName.endsWith("Schema") ? rootName : `${rootName}Schema`;
  const rootType = pascal(rootName);

  if (collected.root.kind === "object" && collected.root.name) {
    const rootObjectName = collected.root.name;
    // The collected root is already declared as `${rootObjectName}Schema` and
    // `${rootObjectName}`; only emit further aliases if `rootName` would
    // produce *different* identifiers. Otherwise we'd double-export the same
    // type, which TS rightly flags.
    if (rootConst !== `${rootObjectName}Schema`) {
      blocks.push(`export const ${rootConst} = ${rootObjectName}Schema;`);
    }
    if (rootType !== rootObjectName) {
      blocks.push(`export type ${rootType} = z.infer<typeof ${rootConst}>;`);
    }
  } else {
    // Root is primitive / array / mixed — emit the schema directly.
    blocks.push(`export const ${rootConst} = ${refToZod(collected.root, refinements)};`);
    blocks.push(`export type ${rootType} = z.infer<typeof ${rootConst}>;`);
  }

  return `import { z } from "zod";\n\n${blocks.join("\n\n")}\n`;
}
