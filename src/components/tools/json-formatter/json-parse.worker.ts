/// <reference lib="webworker" />

import { tryJsToJson, type Transform } from "./js-to-json.lib";

/**
 * Off-main-thread JSON.parse + validation, plus JS-object → JSON conversion.
 * The worker owns heavy synchronous work so the main thread stays paint-able
 * — that's what makes the "Analysing…" spinner in the JS→JSON banner real.
 *
 * Two request shapes share the one worker (one channel, fewer singletons):
 *   - `parse`     — JSON.parse + validation for big inputs
 *   - `transform` — tryJsToJson + JSON.stringify, returns formatted JSON
 *
 * Responses carry the same `kind` so a listener can filter by request type
 * before checking the request id.
 */

interface ParseRequest {
  kind: "parse";
  id: number;
  src: string;
}
interface TransformRequest {
  kind: "transform";
  id: number;
  src: string;
}
type WorkerRequest = ParseRequest | TransformRequest;

type ParseResponse =
  | {
      kind: "parse";
      id: number;
      ok: true;
      value: unknown;
      bytes: number;
      lines: number;
    }
  | {
      kind: "parse";
      id: number;
      ok: false;
      message: string;
      line: number;
      col: number;
    };
type TransformResponse =
  | {
      kind: "transform";
      id: number;
      ok: true;
      output: string;
      transforms: Transform[];
    }
  | { kind: "transform"; id: number; ok: false };

// Worker globals collide with the DOM lib in this project's tsconfig; this
// single cast narrows `self` to the worker scope so the message API is typed.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

const encoder = new TextEncoder();

function countLines(s: string): number {
  let n = 1;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

// Inlined (no app imports — keeps the worker bundle tiny). Mirrors
// json-formatter.lib's parseErrorPosition.
function errorPos(
  message: string,
  raw: string,
): { message: string; line: number; col: number } {
  const posMatch = /position\s+(\d+)/i.exec(message);
  if (posMatch) {
    const pos = Number(posMatch[1]);
    const before = raw.slice(0, pos);
    const lines = before.split("\n");
    return {
      message: message.replace(/\s*\(line[^)]*\)/, "").trim(),
      line: lines.length,
      col: (lines[lines.length - 1]?.length ?? 0) + 1,
    };
  }
  const lc = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
  if (lc) {
    return { message, line: Number(lc[1]), col: Number(lc[2]) };
  }
  return { message, line: 1, col: 1 };
}

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;

  if (req.kind === "transform") {
    const { id, src } = req;
    const result = tryJsToJson(src);
    if (result.ok) {
      ctx.postMessage({
        kind: "transform",
        id,
        ok: true,
        output: result.output,
        transforms: result.transforms,
      } satisfies TransformResponse);
    } else {
      ctx.postMessage({
        kind: "transform",
        id,
        ok: false,
      } satisfies TransformResponse);
    }
    return;
  }

  const { id, src } = req;
  try {
    const value: unknown = JSON.parse(src);
    ctx.postMessage({
      kind: "parse",
      id,
      ok: true,
      value,
      bytes: encoder.encode(src).length,
      lines: countLines(src),
    } satisfies ParseResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const { message, line, col } = errorPos(msg, src);
    ctx.postMessage({
      kind: "parse",
      id,
      ok: false,
      message,
      line,
      col,
    } satisfies ParseResponse);
  }
};

export {};
