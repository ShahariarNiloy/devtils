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
  needsField: boolean;
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

/** A property plus the Python identifier chosen for it. */
interface PyField {
  key: string;
  ident: string;
  ref: TypeRef;
  optional: boolean;
}

/** `# JSON key: "user-id"` when the identifier had to differ from the key. */
function keyNote(f: PyField): string {
  return f.ident === f.key ? "" : `  # JSON key: ${pyStr(f.key)}`;
}

function emitDataclass(t: CollectedType, ctx: Ctx, useSlots: boolean): string[] {
  // Required fields first (no defaults), optional after (default = None).
  // Python's dataclass refuses fields-without-default after a default field,
  // so this ordering is non-negotiable. Nullable-but-required fields are
  // grouped with optional so the dataclass stays well-formed.
  const fields = pyFields(t, false);
  const isOpt = (p: PyField) => p.optional || !!p.ref.nullable;
  const req = fields.filter((p) => !isOpt(p));
  const opt = fields.filter((p) => isOpt(p));
  const decorator = useSlots ? `@dataclass(slots=True)` : `@dataclass`;
  const lines: string[] = [decorator, `class ${t.name}:`];
  if (req.length === 0 && opt.length === 0) {
    lines.push(`    pass`);
    return lines;
  }
  for (const p of req) {
    lines.push(`    ${p.ident}: ${refToPy(p.ref, ctx)}${keyNote(p)}`);
  }
  for (const p of opt) {
    const inner = basePy(p.ref, ctx);
    ctx.needsOptional = true;
    const wrapped = inner === "Any" ? inner : `Optional[${inner}]`;
    lines.push(`    ${p.ident}: ${wrapped} = None${keyNote(p)}`);
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
  const fields = pyFields(t, false);
  if (fields.some((f) => f.ident !== f.key)) {
    // A TypedDict's keys *are* its field names, so a key that isn't a valid
    // identifier (`user-id`, `class`) needs the functional syntax to keep the
    // real key. Its value types are evaluated eagerly, so they are quoted
    // (forward references) — the `__future__` import doesn't cover them.
    const lines = [`${t.name} = TypedDict(`, `    ${pyStr(t.name)},`, `    {`];
    for (const p of t.properties) {
      lines.push(`        ${pyStr(p.key)}: ${pyStr(refToPy(p.ref, ctx))},`);
    }
    lines.push(`    },`);
    if (anyOptional) lines.push(`    total=False,`);
    lines.push(`)`);
    return lines;
  }
  const header = anyOptional
    ? `class ${t.name}(TypedDict, total=False):`
    : `class ${t.name}(TypedDict):`;
  const lines: string[] = [header];
  if (fields.length === 0) {
    lines.push(`    pass`);
    return lines;
  }
  for (const p of fields) {
    lines.push(`    ${p.ident}: ${refToPy(p.ref, ctx)}`);
  }
  return lines;
}

function emitPydantic(t: CollectedType, ctx: Ctx): string[] {
  ctx.needsPydantic = true;
  const lines: string[] = [`class ${t.name}(BaseModel):`];
  const fields = pyFields(t, true);
  if (fields.length === 0) {
    lines.push(`    pass`);
    return lines;
  }
  for (const p of fields) {
    const optionalKey = p.optional || !!p.ref.nullable;
    // `Field(alias=…)` keeps validation keyed on the original JSON key when
    // the attribute name had to change.
    const alias = p.ident === p.key ? null : `alias=${pyStr(p.key)}`;
    if (alias) ctx.needsField = true;
    if (optionalKey) {
      const inner = basePy(p.ref, ctx);
      ctx.needsOptional = true;
      const wrapped = inner === "Any" ? inner : `Optional[${inner}]`;
      const dflt = alias ? `Field(default=None, ${alias})` : "None";
      lines.push(`    ${p.ident}: ${wrapped} = ${dflt}`);
    } else {
      const dflt = alias ? ` = Field(${alias})` : "";
      lines.push(`    ${p.ident}: ${refToPy(p.ref, ctx)}${dflt}`);
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

/**
 * Names the generated module imports. A field called `date` with a `None`
 * default rebinds `date` inside the class body, and Pydantic then resolves
 * the `date` annotation to `None` — so these get the keyword `_` suffix too.
 */
const PY_SHADOWED = new Set([
  "Optional", "Any", "TypedDict", "BaseModel", "Field", "UUID",
  "datetime", "date", "dataclass", "annotations",
]);

/** Python string literal (JSON escapes are valid Python escapes). */
function pyStr(s: string): string {
  return JSON.stringify(s);
}

/**
 * Bare identifier for a key, or "" when no ASCII letter/digit survives
 * (caller assigns `field_N`). Accented Latin is transliterated; a leading
 * digit gets a `field_` prefix. Pydantic treats `_x` as a private attribute,
 * not a field, so in that mode leading underscores are dropped (the alias
 * keeps the key).
 */
function pyFieldBase(key: string, pydantic: boolean): string {
  let n = key.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9_]/g, "_");
  if (!/[A-Za-z0-9]/.test(n)) return "";
  if (pydantic) n = n.replace(/^_+/, "");
  if (/^[0-9]/.test(n)) n = `field_${n}`;
  if (PY_KEYWORDS.has(n) || PY_SHADOWED.has(n)) n = `${n}_`;
  return n;
}

/**
 * Per-class identifiers, deduped with `_2`, `_3` suffixes. Keys that already
 * are valid identifiers claim their name first, so `{"user-id", "user_id"}`
 * gives `user_id` to the real `user_id` key and `user_id_2` to `user-id`.
 */
function pyFields(t: CollectedType, pydantic: boolean): PyField[] {
  const bases = t.properties.map((p) => pyFieldBase(p.key, pydantic));
  const idents: string[] = new Array<string>(bases.length);
  const taken = new Set<string>();
  bases.forEach((b, i) => {
    if (b && b === t.properties[i].key && !taken.has(b)) {
      idents[i] = b;
      taken.add(b);
    }
  });
  let fallback = 0;
  bases.forEach((b, i) => {
    if (idents[i] !== undefined) return;
    let base = b;
    if (!base) {
      do fallback += 1; while (taken.has(`field_${fallback}`));
      base = `field_${fallback}`;
    }
    let ident = base;
    for (let n = 2; taken.has(ident); n++) ident = `${base}_${n}`;
    taken.add(ident);
    idents[i] = ident;
  });
  return t.properties.map((p, i) => ({ key: p.key, ident: idents[i], ref: p.ref, optional: p.optional }));
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
    needsField: false,
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

  // Non-object roots get a module-level alias. It must come *after* the
  // classes (module-level assignments are evaluated eagerly, unlike the
  // annotations `from __future__ import annotations` defers), and it must be
  // resolved before the import list is built so `Any` / `Optional` it uses
  // are imported.
  let aliasBlock = "";
  // `collect` reserved the configured root name, so it can't clash.
  if (collected.root.kind !== "object") {
    aliasBlock = `${collected.rootName} = ${refToPy(collected.root, ctx)}`;
  }

  const imports: string[] = ["from __future__ import annotations"];
  if (classKind === "dataclass" && collected.types.length > 0) {
    imports.push("from dataclasses import dataclass");
  }

  const typing: string[] = [];
  if (ctx.needsOptional) typing.push("Optional");
  if (ctx.needsAny) typing.push("Any");
  if (ctx.needsTypedDict) typing.push("TypedDict");
  if (typing.length > 0) imports.push(`from typing import ${typing.join(", ")}`);

  if (ctx.needsPydantic) {
    imports.push(`from pydantic import ${ctx.needsField ? "BaseModel, Field" : "BaseModel"}`);
  }

  if (ctx.needsDatetime || ctx.needsDate) {
    const dt = [
      ctx.needsDatetime ? "datetime" : null,
      ctx.needsDate ? "date" : null,
    ].filter(Boolean).join(", ");
    imports.push(`from datetime import ${dt}`);
  }
  if (ctx.needsUuid) imports.push(`from uuid import UUID`);

  const body = [...blocks, aliasBlock].filter((b) => b.length > 0);
  return [imports.join("\n"), "", "", body.join("\n\n\n"), ""].join("\n");
}
