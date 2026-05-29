import type { ConversionResult } from "./json-formatter.types";
import { byteLength as byteSize } from "./json-formatter.lib";
import { inferJsonSchema } from "./schema-infer";
import { collect } from "./codegen/collect";
import { emitGo, type GoEmitOptions } from "./codegen/emit-go";
import { emitPython, type PythonEmitOptions } from "./codegen/emit-python";
import { emitRust, type RustEmitOptions } from "./codegen/emit-rust";
import { emitTypeScript, type TypeScriptEmitOptions } from "./codegen/emit-typescript";
import { emitZod, type ZodEmitOptions } from "./codegen/emit-zod";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Flatten a nested object using the provided delimiter as the key joiner. */
function flattenObject(
  obj: Record<string, unknown>,
  delimiter: string,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}${delimiter}${k}` : k;
    if (isPlainObject(v)) {
      Object.assign(out, flattenObject(v as Record<string, unknown>, delimiter, key));
    } else if (Array.isArray(v)) {
      // Arrays serialise as JSON inside the cell — preserves data without
      // exploding the column count, which would happen with index suffixes.
      out[key] = JSON.stringify(v);
    } else {
      out[key] = v === null || v === undefined ? "" : String(v);
    }
  }
  return out;
}

function csvEscape(v: string, delimiter: string): string {
  if (v.includes(delimiter) || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export interface CsvOptions {
  /** Column separator (`,` default). */
  delimiter?: string;
  /** Joiner for nested keys (`.` default). */
  flattenDelimiter?: string;
  /** Include a leading header row (default true). */
  includeHeader?: boolean;
  /** Prefix a UTF-8 BOM so Excel detects encoding. */
  bom?: boolean;
  /** Line separator (`\n` default, set to `\r\n` for CRLF). */
  newline?: "\n" | "\r\n";
}

/** Convert array-of-objects JSON to CSV. Nested objects are flattened. */
export function toCSV(value: unknown, opts: CsvOptions = {}): ConversionResult {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("CSV conversion requires a non-empty array of objects");
  }
  const delimiter = opts.delimiter ?? ",";
  const flattenDelim = opts.flattenDelimiter ?? ".";
  const includeHeader = opts.includeHeader ?? true;
  const newline = opts.newline ?? "\n";

  const rows = value.map((item) => {
    if (!isPlainObject(item)) throw new Error("All array items must be objects");
    return flattenObject(item as Record<string, unknown>, flattenDelim);
  });
  const headers = Array.from(new Set(rows.flatMap(Object.keys)));
  const headerLine = includeHeader
    ? headers.map((h) => csvEscape(h, delimiter)).join(delimiter)
    : null;
  const bodyLines = rows.map((row) =>
    headers.map((h) => csvEscape(row[h] ?? "", delimiter)).join(delimiter),
  );
  const lines = headerLine ? [headerLine, ...bodyLines] : bodyLines;
  const body = lines.join(newline);
  const output = opts.bom ? `﻿${body}` : body;
  return { output, format: "csv", size: byteSize(output) };
}

// ── YAML ──────────────────────────────────────────────────────────────────────

export interface YamlOptions {
  indent?: number;
  lineWidth?: number;
  /** Sort object keys alphabetically (default false — preserve insertion). */
  sortKeys?: boolean;
  /**
   * Number of objects to expand into block style before switching to flow.
   * `-1` (default) keeps everything in block style — most legible.
   */
  flowLevel?: number;
  /** Use `'` or `"` for explicit string quotes (default auto). */
  quotingType?: "'" | '"';
}

/** Convert JSON value to YAML string. */
export function toYAML(value: unknown, opts: YamlOptions = {}): ConversionResult {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yaml = require("js-yaml") as { dump: (v: unknown, opts: Record<string, unknown>) => string };
  const dumpOpts: Record<string, unknown> = {
    indent: opts.indent ?? 2,
    lineWidth: opts.lineWidth ?? 120,
    noRefs: true,
    sortKeys: !!opts.sortKeys,
    flowLevel: opts.flowLevel ?? -1,
  };
  if (opts.quotingType) dumpOpts.quotingType = opts.quotingType;
  const output = yaml.dump(value, dumpOpts);
  return { output, format: "yaml", size: byteSize(output) };
}

// ── TypeScript ────────────────────────────────────────────────────────────────

export interface TypeScriptOptions extends TypeScriptEmitOptions {
  rootName?: string;
}

/** Generate TypeScript interface(s) from a JSON value. */
export function toTypeScript(
  value: unknown,
  optsOrRootName: TypeScriptOptions | string = {},
): ConversionResult {
  // String overload preserves the original `toTypeScript(value, "MyRoot")` API.
  const opts: TypeScriptOptions = typeof optsOrRootName === "string"
    ? { rootName: optsOrRootName }
    : optsOrRootName;
  const rootName = opts.rootName ?? "Root";
  const collected = collect(inferJsonSchema(value), rootName);
  const output = emitTypeScript(collected, opts);
  return { output, format: "typescript", size: byteSize(output) };
}

// ── Zod ───────────────────────────────────────────────────────────────────────

export type ZodOptions = ZodEmitOptions;

/** Generate a Zod schema from a JSON value. */
export function toZod(
  value: unknown,
  optsOrRootName: ZodOptions | string = {},
): ConversionResult {
  const opts: ZodOptions = typeof optsOrRootName === "string"
    ? { rootName: optsOrRootName }
    : optsOrRootName;
  const rootName = opts.rootName ?? "root";
  // Collect with PascalCase'd root so subtypes get reasonable names.
  const pascalRoot = rootName.charAt(0).toUpperCase() + rootName.slice(1);
  const collected = collect(inferJsonSchema(value), pascalRoot);
  const output = emitZod(collected, opts);
  return { output, format: "zod", size: byteSize(output) };
}

// ── XML ───────────────────────────────────────────────────────────────────────

export interface XmlOptions {
  rootTag?: string;
  /** Tag used for array items (default `item`). */
  itemTag?: string;
  /** Emit `<?xml version="1.0" encoding="UTF-8"?>` (default true). */
  declaration?: boolean;
  /** Indentation width in spaces (default 2). */
  indent?: number;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toXmlNode(
  value: unknown,
  tag: string,
  depth: number,
  itemTag: string,
  indentStr: string,
): string {
  const indent = indentStr.repeat(depth);

  if (value === null) return `${indent}<${tag} nil="true"/>`;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return `${indent}<${tag}>${xmlEscape(String(value))}</${tag}>`;
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => toXmlNode(v, itemTag, depth + 1, itemTag, indentStr)).join("\n");
    return `${indent}<${tag}>\n${items}\n${indent}</${tag}>`;
  }
  if (isPlainObject(value)) {
    const children = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) =>
        toXmlNode(v, /^[a-zA-Z_]/.test(k) ? k : `_${k}`, depth + 1, itemTag, indentStr),
      )
      .join("\n");
    return `${indent}<${tag}>\n${children}\n${indent}</${tag}>`;
  }
  return `${indent}<${tag}/>`;
}

/** Convert a JSON value to XML. */
export function toXML(
  value: unknown,
  optsOrRootTag: XmlOptions | string = {},
): ConversionResult {
  const opts: XmlOptions = typeof optsOrRootTag === "string"
    ? { rootTag: optsOrRootTag }
    : optsOrRootTag;
  const rootTag = opts.rootTag ?? "root";
  const itemTag = opts.itemTag ?? "item";
  const includeDecl = opts.declaration ?? true;
  const indentStr = " ".repeat(opts.indent ?? 2);

  const body = toXmlNode(value, rootTag, 0, itemTag, indentStr);
  const output = includeDecl
    ? `<?xml version="1.0" encoding="UTF-8"?>\n${body}`
    : body;
  return { output, format: "xml", size: byteSize(output) };
}

// ── JSON Schema ──────────────────────────────────────────────────────────────

export interface JsonSchemaOptions {
  /** `2020-12` (default) or `draft-07` for older tooling. */
  draft?: "2020-12" | "draft-07";
}

const DRAFT_URI: Record<NonNullable<JsonSchemaOptions["draft"]>, string> = {
  "2020-12": "https://json-schema.org/draft/2020-12/schema",
  "draft-07": "http://json-schema.org/draft-07/schema#",
};

/** Infer a JSON Schema from the sample value. */
export function toJsonSchema(
  value: unknown,
  opts: JsonSchemaOptions = {},
): ConversionResult {
  const schema = inferJsonSchema(value);
  if (opts.draft && opts.draft !== "2020-12") {
    schema.$schema = DRAFT_URI[opts.draft];
  }
  const output = JSON.stringify(schema, null, 2);
  return { output, format: "schema", size: byteSize(output) };
}

// ── Code generators (built on schema IR) ─────────────────────────────────────

export type GoOptions = GoEmitOptions;
export interface PythonOptions extends PythonEmitOptions {
  /** Root type name when root is not an object (default "Root"). */
  rootName?: string;
}
export interface RustOptions extends RustEmitOptions {
  /** Root type name (default "Root"). */
  rootName?: string;
}

/** Generate Go structs from the inferred schema. */
export function toGo(value: unknown, opts: GoOptions = {}): ConversionResult {
  const collected = collect(inferJsonSchema(value), "Root");
  const output = emitGo(collected, opts);
  return { output, format: "go", size: byteSize(output) };
}

/** Generate Python dataclasses (or TypedDict / Pydantic) from the inferred schema. */
export function toPython(value: unknown, opts: PythonOptions = {}): ConversionResult {
  const collected = collect(inferJsonSchema(value), opts.rootName ?? "Root");
  const output = emitPython(collected, opts);
  return { output, format: "python", size: byteSize(output) };
}

/** Generate Rust serde structs from the inferred schema. */
export function toRust(value: unknown, opts: RustOptions = {}): ConversionResult {
  const collected = collect(inferJsonSchema(value), opts.rootName ?? "Root");
  const output = emitRust(collected, opts);
  return { output, format: "rust", size: byteSize(output) };
}
