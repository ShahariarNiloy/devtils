/// <reference lib="webworker" />

import {
  computeDiff,
  computePatch,
  modelTransferables,
  type CompareSettings,
  type DiffModel,
  type DiffSession,
  type PatchModel,
} from "./json-diff.engine";

/**
 * Off-main-thread compare for large documents: parse both sides, diff,
 * build the row table, and (on request) the verified JSON Patch. The
 * parsed documents stay here between requests, so a patch request only
 * names the compare it belongs to. Row buffers are transferred, not copied.
 */

export type JsonDiffRequest =
  | { kind: "diff"; id: number; left: string; right: string; settings: CompareSettings }
  | { kind: "patch"; id: number; diffId: number };

export type JsonDiffResponse =
  | { kind: "diff"; id: number; model: DiffModel }
  | { kind: "patch"; id: number; diffId: number; patch: PatchModel | null };

let session: DiffSession | null = null;
let sessionId = -1;

self.onmessage = (e: MessageEvent<JsonDiffRequest>) => {
  const req = e.data;
  if (req.kind === "diff") {
    const out = computeDiff(req.left, req.right, req.settings);
    session = out.session;
    sessionId = req.id;
    const res: JsonDiffResponse = { kind: "diff", id: req.id, model: out.model };
    self.postMessage(res, modelTransferables(out.model));
    return;
  }
  const patch = session && sessionId === req.diffId ? computePatch(session) : null;
  const res: JsonDiffResponse = { kind: "patch", id: req.id, diffId: req.diffId, patch };
  self.postMessage(res);
};
