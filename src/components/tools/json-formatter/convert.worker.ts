/// <reference lib="webworker" />

/**
 * Off-main-thread JSON → X conversion. Used for large inputs (see
 * `convert-client`). The worker parses the JSON text itself and runs the
 * (pure) converter, so a 5 MB → TypeScript/Zod/XML walk never freezes the
 * tab. Only the resulting string crosses back — cheap, no structured clone
 * of the parsed object.
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
} from "./json-convert";

interface ConvertRequest {
  id: number;
  target: ConvertTarget;
  jsonText: string;
}
type ConvertResponse =
  | { id: number; ok: true; result: ConversionResult }
  | { id: number; ok: false; message: string };

// Worker globals collide with the DOM lib in this project's tsconfig; this
// single cast narrows `self` to the worker scope so the message API is typed.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

function run(target: ConvertTarget, value: unknown): ConversionResult {
  switch (target) {
    case "csv":
      return toCSV(value);
    case "yaml":
      return toYAML(value);
    case "typescript":
      return toTypeScript(value);
    case "xml":
      return toXML(value);
    case "zod":
      return toZod(value);
    case "schema":
      return toJsonSchema(value);
    case "go":
      return toGo(value);
    case "python":
      return toPython(value);
    case "rust":
      return toRust(value);
    default:
      throw new Error(`Unknown target: ${target as string}`);
  }
}

ctx.onmessage = (e: MessageEvent<ConvertRequest>) => {
  const { id, target, jsonText } = e.data;
  try {
    const value: unknown = JSON.parse(jsonText);
    ctx.postMessage({
      id,
      ok: true,
      result: run(target, value),
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
