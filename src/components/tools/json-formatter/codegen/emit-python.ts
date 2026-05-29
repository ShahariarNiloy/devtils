/**
 * Python emitter. Defaults to dataclasses (stdlib, no deps); TypedDict and
 * Pydantic v2 BaseModel are available as opt-ins. String formats map to
 * datetime / date / UUID where the mapping is unambiguous, sparing the
 * consumer a re-parse pass.
 */

import type { CollectResult, CollectedType, TypeRef } from "./collect";

export type PythonClassKind = "dataclass" | "typeddict" | "pydantic";

export interface PythonEmitOptions {
  classKind?: PythonClassKind;
  /** dataclass-only: emit `slots=True` for the ~20% memory win. */
  useSlots?: boolean;
}

interface Ctx {
  needsOptional: boolean;
  needsAny: boolean;
  needsDatetime: boolean;
  needsDate: boolean;
  needsUuid: boolean;
  needsTypedDict: boolean;
  needsPydantic: boolean;
}

function basePy(ref: TypeRef, ctx: Ctx): string {
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

function refToPy(ref: TypeRef, ctx: Ctx): string {
  const base = basePy(ref, ctx);
  if (ref.nullable && base !== "Any") {
    ctx.needsOptional = true;
    return `Optional[${base}]`;
  }
  return base;
}

function emitDataclass(t: CollectedType, ctx: Ctx, useSlots: boolean): string[] {
  // Required fields first (no defaults), optional after (default = None).
  // Python's dataclass refuses fields-without-default after a default field,
  // so this ordering is non-negotiable. Nullable-but-required fields are
  // grouped with optional so the dataclass stays well-formed.
  const isOpt = (p: { optional: boolean; ref: TypeRef }) =>
    p.optional || !!p.ref.nullable;
  const req = t.properties.filter((p) => !isOpt(p));
  const opt = t.properties.filter((p) => isOpt(p));

  const decorator = useSlots ? `@dataclass(slots=True)` : `@dataclass`;
  const lines: string[] = [decorator, `class ${t.name}:`];
  if (req.length === 0 && opt.length === 0) {
    lines.push(`    pass`);
    return lines;
  }
  for (const p of req) {
    lines.push(`    ${safeIdent(p.key)}: ${refToPy(p.ref, ctx)}`);
  }
  for (const p of opt) {
    const inner = basePy(p.ref, ctx);
    ctx.needsOptional = true;
    const wrapped = inner === "Any" ? inner : `Optional[${inner}]`;
    lines.push(`    ${safeIdent(p.key)}: ${wrapped} = None`);
  }
  return lines;
}

function emitTypedDict(t: CollectedType, ctx: Ctx): string[] {
  ctx.needsTypedDict = true;
  // TypedDict treats missing keys as type errors by default. For records with
  // any optional fields, switch to `total=False`. (TypedDict supports partial
  // totality declarations but the syntax is verbose — using class-level
  // `total=False` plus `Required[…]` would be cleaner if we needed mixed.)
  const anyOptional = t.properties.some((p) => p.optional);
  const header = anyOptional
    ? `class ${t.name}(TypedDict, total=False):`
    : `class ${t.name}(TypedDict):`;
  const lines: string[] = [header];
  if (t.properties.length === 0) {
    lines.push(`    pass`);
    return lines;
  }
  for (const p of t.properties) {
    lines.push(`    ${safeIdent(p.key)}: ${refToPy(p.ref, ctx)}`);
  }
  return lines;
}

function emitPydantic(t: CollectedType, ctx: Ctx): string[] {
  ctx.needsPydantic = true;
  const lines: string[] = [`class ${t.name}(BaseModel):`];
  if (t.properties.length === 0) {
    lines.push(`    pass`);
    return lines;
  }
  for (const p of t.properties) {
    const optionalKey = p.optional || !!p.ref.nullable;
    const inner = basePy(p.ref, ctx);
    if (optionalKey) {
      ctx.needsOptional = true;
      const wrapped = inner === "Any" ? inner : `Optional[${inner}]`;
      lines.push(`    ${safeIdent(p.key)}: ${wrapped} = None`);
    } else {
      lines.push(`    ${safeIdent(p.key)}: ${refToPy(p.ref, ctx)}`);
    }
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

export function emitPython(
  collected: CollectResult,
  opts: PythonEmitOptions = {},
): string {
  const classKind = opts.classKind ?? "dataclass";
  const useSlots = !!opts.useSlots;

  const ctx: Ctx = {
    needsOptional: false,
    needsAny: false,
    needsDatetime: false,
    needsDate: false,
    needsUuid: false,
    needsTypedDict: false,
    needsPydantic: false,
  };

  const pickEmitter = (t: CollectedType): string[] => {
    if (classKind === "typeddict") return emitTypedDict(t, ctx);
    if (classKind === "pydantic") return emitPydantic(t, ctx);
    return emitDataclass(t, ctx, useSlots);
  };
  const blocks = collected.types.map((t) => {
    const emit = pickEmitter(t);
    return emit.join("\n");
  });

  const imports: string[] = ["from __future__ import annotations"];
  if (classKind === "dataclass") imports.push("from dataclasses import dataclass");

  const typing: string[] = [];
  if (ctx.needsOptional) typing.push("Optional");
  if (ctx.needsAny) typing.push("Any");
  if (ctx.needsTypedDict) typing.push("TypedDict");
  if (typing.length > 0) imports.push(`from typing import ${typing.join(", ")}`);

  if (ctx.needsPydantic) imports.push("from pydantic import BaseModel");

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
