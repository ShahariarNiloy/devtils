/**
 * Python emitter. Uses dataclasses (stdlib, no deps) plus typing imports.
 * String formats are mapped to datetime / date / UUID types where the
 * mapping is unambiguous — saves the consumer from re-parsing dates.
 */

import type { CollectResult, CollectedType, TypeRef } from "./collect";

interface Ctx {
  needsOptional: boolean;
  needsAny: boolean;
  needsDatetime: boolean;
  needsDate: boolean;
  needsUuid: boolean;
}

function refToPy(ref: TypeRef, ctx: Ctx): string {
  switch (ref.kind) {
    case "object": return ref.name ?? "Any";
    case "array": {
      if (!ref.item) { ctx.needsAny = true; return "list[Any]"; }
      return `list[${refToPy(ref.item, ctx)}]`;
    }
    case "primitive":
      switch (ref.prim) {
        case "string": return "str";
        case "integer": return "int";
        case "number": return "float";
        case "boolean": return "bool";
        default: ctx.needsAny = true; return "Any";
      }
    case "string-format":
      if (ref.format === "date-time") { ctx.needsDatetime = true; return "datetime"; }
      if (ref.format === "date") { ctx.needsDate = true; return "date"; }
      if (ref.format === "uuid") { ctx.needsUuid = true; return "UUID"; }
      return "str";
    case "mixed":
    case "any":
    case "null":
      ctx.needsAny = true;
      return "Any";
  }
}

function emitClass(t: CollectedType, ctx: Ctx): string[] {
  // Required fields first (no defaults), optional after (default = None).
  // Python's dataclass refuses fields-without-default after a default field,
  // so this ordering is non-negotiable.
  const req = t.properties.filter((p) => !p.optional);
  const opt = t.properties.filter((p) => p.optional);

  const lines: string[] = [];
  lines.push(`@dataclass`);
  lines.push(`class ${t.name}:`);
  if (req.length === 0 && opt.length === 0) {
    lines.push(`    pass`);
    return lines;
  }
  for (const p of req) {
    lines.push(`    ${safeIdent(p.key)}: ${refToPy(p.ref, ctx)}`);
  }
  for (const p of opt) {
    ctx.needsOptional = true;
    lines.push(
      `    ${safeIdent(p.key)}: Optional[${refToPy(p.ref, ctx)}] = None`,
    );
  }
  return lines;
}

const PY_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await",
  "break", "class", "continue", "def", "del", "elif", "else", "except",
  "finally", "for", "from", "global", "if", "import", "in", "is",
  "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try",
  "while", "with", "yield", "match", "case",
]);

function safeIdent(s: string): string {
  let n = s.replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z_]/.test(n)) n = `_${n}`;
  if (PY_KEYWORDS.has(n)) n = `${n}_`;
  return n;
}

export function emitPython(collected: CollectResult): string {
  const ctx: Ctx = {
    needsOptional: false,
    needsAny: false,
    needsDatetime: false,
    needsDate: false,
    needsUuid: false,
  };

  // Run emit first to populate `ctx.needsX`. We collect emitted blocks then
  // prepend imports.
  const blocks = collected.types.map((t) => emitClass(t, ctx).join("\n"));

  const imports: string[] = [
    "from __future__ import annotations",
    "from dataclasses import dataclass",
  ];

  const typing: string[] = [];
  if (ctx.needsOptional) typing.push("Optional");
  if (ctx.needsAny) typing.push("Any");
  if (typing.length > 0) imports.push(`from typing import ${typing.join(", ")}`);

  if (ctx.needsDatetime || ctx.needsDate) {
    const dt = [
      ctx.needsDatetime ? "datetime" : null,
      ctx.needsDate ? "date" : null,
    ].filter(Boolean).join(", ");
    imports.push(`from datetime import ${dt}`);
  }
  if (ctx.needsUuid) imports.push(`from uuid import UUID`);

  const aliasBlock =
    collected.root.kind === "object"
      ? ""
      : `Root = ${refToPy(collected.root, ctx)}\n`;

  return [
    imports.join("\n"),
    "",
    aliasBlock,
    blocks.join("\n\n\n"),
    "",
  ].join("\n");
}
