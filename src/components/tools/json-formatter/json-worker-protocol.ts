/**
 * Message protocol for `json-parse.worker.ts` — the one JSON worker shared by
 * the background parse, the JS → JSON detector and the heavy toolbar actions
 * (Format / Minify / Sort / Repair / Validate) plus the precision scan.
 *
 * Every message carries a `kind` (the channel) and an `id`, so a listener
 * filters by channel first, then drops responses from superseded requests.
 * Action responses carry strings and small metadata only — never a parsed
 * tree — because structured-cloning a big tree back costs more on the main
 * thread than the parse itself.
 *
 * Types only: imported by the worker and by `json-worker-client.ts`.
 */

import type { Transform } from "./js-to-json.lib";
import type { TransferPart } from "./json-transfer";
import type {
  IndentStyle,
  RepairChange,
  RepairResult,
  SortOrder,
  ValidationState,
} from "./json-formatter.types";

// ── Background parse / JS → JSON detector (unchanged channels) ───────────────

export interface ParseRequest {
  kind: "parse";
  id: number;
  src: string;
}
export interface TransformRequest {
  kind: "transform";
  id: number;
  src: string;
}

export type ParseResponse =
  /**
   * `parts` > 0: `value` is a skeleton; that many `parse-part` messages
   * follow (json-transfer.ts) and the tree is complete after the last one.
   */
  | { kind: "parse"; id: number; ok: true; value: unknown; bytes: number; lines: number; parts: number }
  | { kind: "parse"; id: number; ok: false; message: string; line: number; col: number };

export type ParsePartResponse = { kind: "parse-part"; id: number } & TransferPart;

export type TransformResponse =
  | { kind: "transform"; id: number; ok: true; output: string; transforms: Transform[] }
  | { kind: "transform"; id: number; ok: false };

// ── Precision scan ───────────────────────────────────────────────────────────

export interface ScanRequest {
  kind: "scan";
  id: number;
  src: string;
}
export interface ScanResponse {
  kind: "scan";
  id: number;
  impreciseNumbers: number;
}

// ── Background format (Code view of an unformatted input, tool handoff) ─────

/**
 * formatJsonText(src, indent, "none") on the background lane — read-only
 * consumers that must not cancel (or be cancelled by) a toolbar action.
 */
export interface FormatRequest {
  kind: "format";
  id: number;
  src: string;
  indent: IndentStyle;
}
export type FormatResponse =
  | { kind: "format"; id: number; ok: true; output: string }
  | { kind: "format"; id: number; ok: false };

// ── Toolbar actions ──────────────────────────────────────────────────────────

export type ActionOp =
  /** validateJson (when `validate`) then formatJsonText — the Format / Sort path. */
  | { op: "format"; src: string; indent: IndentStyle | null; sort: SortOrder; validate: boolean }
  | { op: "minify"; src: string }
  | { op: "validate"; src: string }
  /** repairJson; when every fix is `safe`, also formats the fixed text. */
  | { op: "repair"; src: string; indent: IndentStyle; sort: SortOrder };

export type ActionRequest = { kind: "action"; id: number } & ActionOp;

export type ActionResult =
  /** A newer action replaced this one (the job was cancelled). */
  | { status: "superseded" }
  /** Format with `validate`: the input isn't valid JSON. */
  | { status: "invalid"; validation: Extract<ValidationState, { status: "invalid" }> }
  /** Format / minify threw — same message the synchronous path would toast. */
  | { status: "error"; message: string }
  | { status: "formatted"; output: string }
  | { status: "minified"; output: string; before: number; after: number; savedPct: number }
  | { status: "validated"; validation: ValidationState }
  /**
   * repairJson returned. `result.fixed` is "" when `wasValid` (the caller
   * never reads it, so 50 MB isn't copied back for nothing). When every fix
   * is safe the fixed text is also formatted: `formatted` / `formattedIsFixed`
   * on success, `formatError` when that format threw.
   */
  | {
      status: "repaired";
      result: RepairResult;
      formatted?: string;
      /** The formatted text equals `result.fixed` (not sent twice). */
      formattedIsFixed?: true;
      formatError?: string;
    }
  /** repairJson threw RepairError — the fields the preview dialog needs. */
  | {
      status: "repair-failed";
      parseError: string;
      partialFixed: string;
      partialChanges: string[];
      partialEvents: RepairChange[];
    };

export type ActionResponse = { kind: "action"; id: number } & ActionResult;

export type WorkerRequest = ParseRequest | TransformRequest | ScanRequest | FormatRequest | ActionRequest;
export type WorkerResponse = ParseResponse | ParsePartResponse | TransformResponse | ScanResponse | FormatResponse | ActionResponse;
