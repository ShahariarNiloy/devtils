"use client";

import { useEffect, useMemo, useState } from "react";
import { parseJson } from "../json-formatter.lib";
import type { ValidationState } from "../json-formatter.types";
import { getJsonWorker, nextWorkerSeq, WORKER_THRESHOLD } from "../json-worker-client";
import type { WorkerResponse } from "../json-worker-protocol";
import { applyPart } from "../json-transfer";

// Below WORKER_THRESHOLD, parse synchronously in render — zero added latency
// for the common case. Above it, offload to the worker.
export { WORKER_THRESHOLD };

export interface AsyncParsed {
  value: unknown;
  /**
   * Validation derived from the worker parse — only populated for large
   * inputs (small inputs are validated synchronously by the caller, so this
   * stays null and there's no behaviour change for them).
   */
  validation: ValidationState | null;
  /**
   * The text `validation` describes. It can lag `src` (stale-while-
   * revalidate), so speculative work keyed on validity — the JS → JSON
   * check — waits until this matches the current text.
   */
  validationFor: string | null;
}

/**
 * Parse `src` to a JS value. Small inputs parse synchronously (no behaviour
 * change). Large inputs go to a worker so JSON.parse never freezes the tab,
 * and the worker also reports validity/error-position so the main thread
 * never re-parses the document just for the validation banner. Last good
 * value is kept until the new parse resolves (stale-while-revalidate).
 *
 * `skip` holds off a large parse — used while a pending action (a large
 * paste being formatted) is about to replace `src`, so the worker doesn't
 * parse, and the main thread doesn't deserialize, a tree that's already
 * stale. The last value stays on screen meanwhile.
 */
export function useAsyncParsed(src: string, skip = false): AsyncParsed {
  const small = src.length <= WORKER_THRESHOLD;

  const sync = useMemo<{ v: unknown } | null>(() => {
    if (!src.trim()) return { v: null };
    if (!small) return null; // defer to the worker branch
    try {
      return { v: parseJson(src) };
    } catch {
      return { v: null };
    }
  }, [src, small]);

  const [asyncState, setAsyncState] = useState<AsyncParsed>({
    value: null,
    validation: null,
    validationFor: null,
  });

  useEffect(() => {
    if (small || skip || !src.trim()) return;
    const worker = getJsonWorker();
    const id = nextWorkerSeq();
    // A big tree arrives as a skeleton plus parts (json-transfer.ts); it's
    // published once the last part is in.
    let assembling: { value: unknown; bytes: number; lines: number; remaining: number } | null = null;
    const publish = (value: unknown, bytes: number, lines: number) =>
      setAsyncState({
        value,
        validation: { status: "valid", size: bytes, lines },
        validationFor: src,
      });
    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (data.kind === "parse-part") {
        if (data.id !== id || !assembling) return;
        applyPart(assembling.value, data);
        if (--assembling.remaining === 0) publish(assembling.value, assembling.bytes, assembling.lines);
        return;
      }
      if (data.kind !== "parse") return; // not our channel
      if (data.id !== id) return; // stale response from a superseded edit
      if (data.ok) {
        if (data.parts > 0) {
          assembling = { value: data.value, bytes: data.bytes, lines: data.lines, remaining: data.parts };
          return;
        }
        publish(data.value, data.bytes, data.lines);
      } else {
        setAsyncState((prev) => ({
          value: prev.value, // keep stale tree; banner shows the error
          validation: {
            status: "invalid",
            message: data.message,
            line: data.line,
            col: data.col,
          },
          validationFor: src,
        }));
      }
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ kind: "parse", id, src });
    return () => worker.removeEventListener("message", onMessage);
  }, [src, small, skip]);

  if (sync) return { value: sync.v, validation: null, validationFor: null };
  return asyncState;
}
