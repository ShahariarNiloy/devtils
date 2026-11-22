/// <reference lib="webworker" />

import { tryJsToJson } from "./js-to-json.lib";
import { byteLength, formatJsonText, minifyJson, validateJson } from "./json-formatter.lib";
import { scanJsonText } from "./json-lossless";
import { RepairError, repairJson } from "./json-repair";
import { splitForTransfer } from "./json-transfer";
import type {
  ActionRequest,
  ActionResult,
  ActionResponse,
  FormatResponse,
  ParsePartResponse,
  ParseResponse,
  ScanResponse,
  TransformResponse,
  WorkerRequest,
} from "./json-worker-protocol";

/**
 * Off-main-thread JSON work. The worker owns heavy synchronous work so the
 * main thread stays paint-able (typing, spinners, the busy labels).
 *
 * Channels (see json-worker-protocol.ts):
 *   - `parse`     — JSON.parse + validation for big inputs (the tree value)
 *   - `transform` — tryJsToJson for the JS → JSON banner
 *   - `scan`      — the lossless-number precision scan
 *   - `format`    — read-only pretty-print (Code view, tool handoff)
 *   - `action`    — Format / Minify / Sort / Validate / Repair on big inputs.
 *     These run the exact same lib functions as the synchronous path, so the
 *     output bytes and error messages are identical; only strings go back.
 *     Actions run in a second instance of this script (json-worker-client),
 *     so a click never queues behind background analysis, and a superseded
 *     action can be terminated mid-run.
 */

// Worker globals collide with the DOM lib in this project's tsconfig; this
// single cast narrows `self` to the worker scope so the message API is typed.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

function countLines(s: string): number {
  let n = 1;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

// Mirrors json-formatter.lib's parseErrorPosition (the parse channel reports
// bytes/lines from its own single pass).
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

// ── Actions ─────────────────────────────────────────────────────────────────

function runAction(req: ActionRequest): ActionResult {
  switch (req.op) {
    case "format": {
      if (req.validate) {
        const v = validateJson(req.src);
        if (v.status === "invalid") return { status: "invalid", validation: v };
      }
      try {
        return { status: "formatted", output: formatJsonText(req.src, req.indent, req.sort) };
      } catch (err) {
        return { status: "error", message: err instanceof Error ? err.message : "Format failed" };
      }
    }
    case "minify":
      try {
        const r = minifyJson(req.src);
        return { status: "minified", output: r.output, before: r.before, after: r.after, savedPct: r.savedPct };
      } catch (err) {
        return { status: "error", message: err instanceof Error ? err.message : "Minify failed" };
      }
    case "validate":
      return { status: "validated", validation: validateJson(req.src) };
    case "repair":
      try {
        const result = repairJson(req.src);
        if (result.wasValid) return { status: "repaired", result: { ...result, fixed: "" } };
        if (result.events.some((e) => e.risk !== "safe")) return { status: "repaired", result };
        // All-safe repairs apply straight away and then format — do that
        // format here too, saving a second round trip of the fixed text.
        // repairJson already proved the fixed text parses, so the main
        // thread's pre-format validate can't fail and is skipped.
        try {
          const formatted = formatJsonText(result.fixed, req.indent, req.sort);
          // The repair serializer already pretty-prints with 2 spaces, so
          // with the default indent and key order the format is a no-op —
          // say so instead of copying the same 50+ MB string back twice.
          if (formatted === result.fixed) return { status: "repaired", result, formattedIsFixed: true };
          return { status: "repaired", result, formatted };
        } catch (err) {
          return { status: "repaired", result, formatError: err instanceof Error ? err.message : "Format failed" };
        }
      } catch (err) {
        if (err instanceof RepairError) {
          return {
            status: "repair-failed",
            parseError: err.parseError,
            partialFixed: err.partialFixed,
            partialChanges: err.partialChanges,
            partialEvents: err.partialEvents,
          };
        }
        return { status: "error", message: err instanceof Error ? err.message : "Repair failed" };
      }
  }
}

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;

  if (req.kind === "action") {
    ctx.postMessage({ kind: "action", id: req.id, ...runAction(req) } satisfies ActionResponse);
    return;
  }

  if (req.kind === "scan") {
    ctx.postMessage({
      kind: "scan",
      id: req.id,
      impreciseNumbers: scanJsonText(req.src).impreciseNumbers,
    } satisfies ScanResponse);
    return;
  }

  if (req.kind === "format") {
    let res: FormatResponse;
    try {
      res = { kind: "format", id: req.id, ok: true, output: formatJsonText(req.src, req.indent, "none") };
    } catch {
      res = { kind: "format", id: req.id, ok: false };
    }
    ctx.postMessage(res);
    return;
  }

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
    // A big tree goes in slices so the main thread deserializes it in many
    // short tasks instead of one ~400 ms one (see json-transfer.ts).
    const { skeleton, parts } = splitForTransfer(value, src.length);
    ctx.postMessage({
      kind: "parse",
      id,
      ok: true,
      value: skeleton,
      bytes: byteLength(src),
      lines: countLines(src),
      parts: parts.length,
    } satisfies ParseResponse);
    for (const part of parts) ctx.postMessage({ kind: "parse-part", id, ...part } satisfies ParsePartResponse);
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
