import type { ConversionResult } from "./json-formatter.types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function byteSize(s: string): number {
  return new TextEncoder().encode(s).length;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Flatten a nested object with dot-notation keys. */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) {
      Object.assign(out, flattenObject(v as Record<string, unknown>, key));
    } else {
      out[key] = v === null || v === undefined ? "" : String(v);
    }
  }
  return out;
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

/** Convert array-of-objects JSON to CSV. Nested objects are flattened with dot notation. */
export function toCSV(value: unknown): ConversionResult {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("CSV conversion requires a non-empty array of objects");
  }
  const rows = value.map((item) => {
    if (!isPlainObject(item)) throw new Error("All array items must be objects");
    return flattenObject(item as Record<string, unknown>);
  });
  const headers = Array.from(new Set(rows.flatMap(Object.keys)));
  const csvRows = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h] ?? "")).join(",")),
  ];
  const output = csvRows.join("\n");
  return { output, format: "csv", size: byteSize(output) };
}

/** Parse CSV text back to an array of objects. Type-infers numbers, booleans, nulls. */
export function fromCSV(raw: string): ConversionResult {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row");

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ",") { fields.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  };

  const coerce = (v: string): unknown => {
    if (v === "") return null;
    if (v === "true") return true;
    if (v === "false") return false;
    const n = Number(v);
    if (!isNaN(n) && v.trim() !== "") return n;
    return v;
  };

  const headers = parseRow(lines[0]);
  const result = lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = coerce(vals[i] ?? ""); });
    return obj;
  });

  const output = JSON.stringify(result, null, 2);
  return { output, format: "csv-to-json", size: byteSize(output) };
}

// ── YAML ──────────────────────────────────────────────────────────────────────

/** Convert JSON value to YAML string. */
export function toYAML(value: unknown): ConversionResult {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yaml = require("js-yaml") as { dump: (v: unknown, opts: Record<string, unknown>) => string };
  const output = yaml.dump(value, { indent: 2, lineWidth: 120, noRefs: true });
  return { output, format: "yaml", size: byteSize(output) };
}

/** Parse YAML back to JSON. */
export function fromYAML(raw: string): ConversionResult {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yaml = require("js-yaml") as { load: (v: string) => unknown };
  const parsed = yaml.load(raw);
  const output = JSON.stringify(parsed, null, 2);
  return { output, format: "yaml-to-json", size: byteSize(output) };
}

// ── TypeScript ────────────────────────────────────────────────────────────────

type TSType = string;

function inferTsType(value: unknown, depth: number, refs: Map<string, string>): TSType {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const types = [...new Set(value.map((v) => inferTsType(v, depth, refs)))];
    const inner = types.length === 1 ? types[0] : `(${types.join(" | ")})`;
    return `${inner}[]`;
  }
  if (isPlainObject(value)) {
    return buildInterface(value as Record<string, unknown>, depth + 1, refs);
  }
  return "unknown";
}

/** Collect all keys across an array of objects to detect optional fields. */
function buildInterface(
  obj: Record<string, unknown>,
  depth: number,
  refs: Map<string, string>,
  allItems?: Record<string, unknown>[],
): string {
  const indent = "  ".repeat(depth);
  const outerIndent = "  ".repeat(depth - 1);
  const lines: string[] = ["{"];
  const universalKeys = allItems
    ? new Set(allItems.flatMap(Object.keys).filter((k) => allItems.every((item) => k in item)))
    : new Set(Object.keys(obj));

  for (const [k, v] of Object.entries(obj)) {
    const isOptional = !universalKeys.has(k);
    const tsType = inferTsType(v, depth, refs);
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
    lines.push(`${indent}${safeKey}${isOptional ? "?" : ""}: ${tsType};`);
  }
  lines.push(`${outerIndent}}`);
  return lines.join("\n");
}

/** Generate TypeScript interface(s) from a JSON value. */
export function toTypeScript(value: unknown, rootName = "Root"): ConversionResult {
  const refs = new Map<string, string>();
  let tsBody: string;

  if (isPlainObject(value)) {
    tsBody = `export interface ${rootName} ${buildInterface(value as Record<string, unknown>, 1, refs)}`;
  } else if (Array.isArray(value) && value.length > 0 && isPlainObject(value[0])) {
    const allItems = value.filter(isPlainObject) as Record<string, unknown>[];
    const merged: Record<string, unknown> = {};
    for (const item of allItems) for (const [k, v] of Object.entries(item)) if (!(k in merged)) merged[k] = v;
    tsBody = `export interface ${rootName} ${buildInterface(merged, 1, refs, allItems)}\n\nexport type ${rootName}Array = ${rootName}[];`;
  } else {
    const tsType = inferTsType(value, 0, refs);
    tsBody = `export type ${rootName} = ${tsType};`;
  }

  const output = tsBody;
  return { output, format: "typescript", size: byteSize(output) };
}

// ── Zod ───────────────────────────────────────────────────────────────────────

function inferZodType(value: unknown, depth: number, allSiblings?: Record<string, unknown>[]): string {
  if (value === null) return "z.null()";
  if (typeof value === "string") return "z.string()";
  if (typeof value === "number") return "z.number()";
  if (typeof value === "boolean") return "z.boolean()";
  if (Array.isArray(value)) {
    if (value.length === 0) return "z.array(z.unknown())";
    const types = [...new Set(value.map((v) => inferZodType(v, depth)))];
    const inner = types.length === 1 ? types[0] : `z.union([${types.join(", ")}])`;
    return `z.array(${inner})`;
  }
  if (isPlainObject(value)) {
    return buildZodObject(value as Record<string, unknown>, depth + 1, allSiblings);
  }
  return "z.unknown()";
}

function buildZodObject(
  obj: Record<string, unknown>,
  depth: number,
  allItems?: Record<string, unknown>[],
): string {
  const indent = "  ".repeat(depth);
  const outerIndent = "  ".repeat(depth - 1);
  const universalKeys = allItems
    ? new Set(allItems.flatMap(Object.keys).filter((k) => allItems.every((item) => k in item)))
    : new Set(Object.keys(obj));
  const lines: string[] = ["z.object({"];
  for (const [k, v] of Object.entries(obj)) {
    const isOptional = !universalKeys.has(k);
    const zodType = inferZodType(v, depth);
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
    lines.push(`${indent}${safeKey}: ${zodType}${isOptional ? ".optional()" : ""},`);
  }
  lines.push(`${outerIndent}})`);
  return lines.join("\n");
}

/** Generate a Zod schema from a JSON value. */
export function toZod(value: unknown, rootName = "root"): ConversionResult {
  let schemaExpr: string;

  if (isPlainObject(value)) {
    schemaExpr = buildZodObject(value as Record<string, unknown>, 1);
  } else if (Array.isArray(value) && value.length > 0 && isPlainObject(value[0])) {
    const allItems = value.filter(isPlainObject) as Record<string, unknown>[];
    const merged: Record<string, unknown> = {};
    for (const item of allItems) for (const [k, v] of Object.entries(item)) if (!(k in merged)) merged[k] = v;
    const itemSchema = buildZodObject(merged, 1, allItems);
    schemaExpr = `z.array(\n  ${itemSchema}\n)`;
  } else {
    schemaExpr = inferZodType(value, 0);
  }

  const typeName = rootName.charAt(0).toUpperCase() + rootName.slice(1);
  const output = [
    `import { z } from "zod";`,
    ``,
    `export const ${rootName}Schema = ${schemaExpr};`,
    ``,
    `export type ${typeName} = z.infer<typeof ${rootName}Schema>;`,
  ].join("\n");

  return { output, format: "zod", size: byteSize(output) };
}

// ── XML ───────────────────────────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toXmlNode(value: unknown, tag: string, depth: number): string {
  const indent = "  ".repeat(depth);

  if (value === null) return `${indent}<${tag} nil="true"/>`;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return `${indent}<${tag}>${xmlEscape(String(value))}</${tag}>`;
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => toXmlNode(v, "item", depth + 1)).join("\n");
    return `${indent}<${tag}>\n${items}\n${indent}</${tag}>`;
  }
  if (isPlainObject(value)) {
    const children = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => toXmlNode(v, /^[a-zA-Z_]/.test(k) ? k : `_${k}`, depth + 1))
      .join("\n");
    return `${indent}<${tag}>\n${children}\n${indent}</${tag}>`;
  }
  return `${indent}<${tag}/>`;
}

/** Convert a JSON value to XML. */
export function toXML(value: unknown, rootTag = "root"): ConversionResult {
  const body = toXmlNode(value, rootTag, 0);
  const output = `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
  return { output, format: "xml", size: byteSize(output) };
}
