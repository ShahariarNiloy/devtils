"use client";

import { useEffect, useMemo, useState } from "react";
import { parseJson } from "../json-formatter.lib";
import type { Transform } from "../js-to-json.lib";
import type { ValidationState } from "../json-formatter.types";

// Below this, parse synchronously in render — identical to the old behaviour,
// zero added latency for the common case. Above it, offload to the worker.
export const WORKER_THRESHOLD = 256_000; // chars (~256 KB)

let workerSingleton: Worker | null = null;
export function getJsonWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new Worker(
      new URL("../json-parse.worker.ts", import.meta.url),
    );
  }
  return workerSingleton;
}

let seq = 0;
export function nextWorkerSeq(): number {
  return ++seq;
}

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

export type TransformResponse =
  | {
      kind: "transform";
      id: number;
      ok: true;
      output: string;
      transforms: Transform[];
    }
  | { kind: "transform"; id: number; ok: false };

export interface AsyncParsed {
  value: unknown;
  /**
   * Validation derived from the worker parse — only populated for large
   * inputs (small inputs are validated synchronously by the caller, so this
   * stays null and there's no behaviour change for them).
   */
  validation: ValidationState | null;
}

/**
 * Parse `src` to a JS value. Small inputs parse synchronously (no behaviour
 * change). Large inputs go to a worker so JSON.parse never freezes the tab,
 * and the worker also reports validity/error-position so the main thread
 * never re-parses the document just for the validation banner. Last good
 * value is kept until the new parse resolves (stale-while-revalidate).
 */
export function useAsyncParsed(src: string): AsyncParsed {
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
  });

  useEffect(() => {
    if (small || !src.trim()) return;
    const worker = getJsonWorker();
    const id = nextWorkerSeq();
    const onMessage = (e: MessageEvent<ParseResponse | TransformResponse>) => {
      const data = e.data;
      if (data.kind !== "parse") return; // not our channel
      if (data.id !== id) return; // stale response from a superseded edit
      if (data.ok) {
        setAsyncState({
          value: data.value,
          validation: {
            status: "valid",
            size: data.bytes,
            lines: data.lines,
          },
        });
      } else {
        setAsyncState((prev) => ({
          value: prev.value, // keep stale tree; banner shows the error
          validation: {
            status: "invalid",
            message: data.message,
            line: data.line,
            col: data.col,
          },
        }));
      }
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ kind: "parse", id, src });
    return () => worker.removeEventListener("message", onMessage);
  }, [src, small]);

  if (sync) return { value: sync.v, validation: null };
  return asyncState;
}
