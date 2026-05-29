/// <reference lib="webworker" />

/**
 * Off-main-thread JSON → X conversion. Used for large inputs (see
 * `convert-client`). The worker parses the JSON text itself and runs the
 * (pure) converter, so a 5 MB → TypeScript/Zod/XML walk never freezes the
 * tab. Only the resulting string crosses back — cheap, no structured clone
 * of the parsed object.
 *
 * Options are forwarded straight to the matching emitter — they're plain
 * JSON-safe objects (string / boolean / number leaves) so structuredClone
 * across `postMessage` is fine.
 */

import type { ConversionResult, ConvertTarget } from "./json-formatter.types";
import {
  toCSV,
  toGo,
  toJsonSchema,
  toPython,
  toRust,
  toTypeScript,
  toXML,
  toYAML,
  toZod,
  type CsvOptions,
  type GoOptions,
  type JsonSchemaOptions,
  type PythonOptions,
  type RustOptions,
  type TypeScriptOptions,
  type XmlOptions,
  type YamlOptions,
  type ZodOptions,
} from "./json-convert";

interface ConvertRequest {
  id: number;
  target: ConvertTarget;
  jsonText: string;
  options?: unknown;
}
type ConvertResponse =
  | { id: number; ok: true; result: ConversionResult }
  | { id: number; ok: false; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function run(target: ConvertTarget, value: unknown, opts: unknown): ConversionResult {
  switch (target) {
    case "csv":         return toCSV(value, opts as CsvOptions | undefined);
    case "yaml":        return toYAML(value, opts as YamlOptions | undefined);
    case "typescript":  return toTypeScript(value, opts as TypeScriptOptions | undefined);
    case "xml":         return toXML(value, opts as XmlOptions | undefined);
    case "zod":         return toZod(value, opts as ZodOptions | undefined);
    case "schema":      return toJsonSchema(value, opts as JsonSchemaOptions | undefined);
    case "go":          return toGo(value, opts as GoOptions | undefined);
    case "python":      return toPython(value, opts as PythonOptions | undefined);
    case "rust":        return toRust(value, opts as RustOptions | undefined);
    default:
      throw new Error(`Unknown target: ${target as string}`);
  }
}

ctx.onmessage = (e: MessageEvent<ConvertRequest>) => {
  const { id, target, jsonText, options } = e.data;
  try {
    const value: unknown = JSON.parse(jsonText);
    ctx.postMessage({
      id,
      ok: true,
      result: run(target, value, options ?? {}),
    } satisfies ConvertResponse);
  } catch (err) {
    ctx.postMessage({
      id,
      ok: false,
      message: err instanceof Error ? err.message : "Conversion failed",
    } satisfies ConvertResponse);
  }
};

export {};
