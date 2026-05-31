"use client";

import { useEffect, useState } from "react";
import type { Transform } from "../js-to-json.lib";
import {
  getJsonWorker,
  nextWorkerSeq,
  type TransformResponse,
} from "./use-async-parsed";

export interface AsyncTransformResult {
  output: string;
  transforms: Transform[];
}

export interface AsyncTransformState {
  /** Non-null only when the worker returned a successful conversion for the
   *  current `enabled + input` pair. Cleared the moment `enabled` flips off
   *  or input changes — no stale banners. */
  result: AsyncTransformResult | null;
  /** True from the moment the request is dispatched until the matching
   *  response (or supersession). Drives the "Analysing…" spinner. */
  isAnalysing: boolean;
}

/**
 * Send `input` to the shared JSON worker and surface the result. The worker
 * runs the state-machine transform and JSON.stringify off the main thread, so
 * even multi-MB inputs leave the UI paint-able — the spinner actually spins.
 *
 * The request only fires when `enabled` is true (caller's call: typically
 * "validation just landed invalid and the user hasn't dismissed"). When
 * enabled flips off, `result` is dropped and a still-in-flight response is
 * ignored via the per-request id guard.
 */
export function useAsyncJsToJson(
  input: string,
  enabled: boolean,
): AsyncTransformState {
  const [state, setState] = useState<AsyncTransformState>({
    result: null,
    isAnalysing: false,
  });

  useEffect(() => {
    if (!enabled || !input.trim()) {
      // Sync the worker-driven state machine with the disabled signal. The
      // codebase already uses this exception for worker/state synchronisation
      // (see use-json-state.ts for the same pattern).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ result: null, isAnalysing: false });
      return;
    }

    const worker = getJsonWorker();
    const id = nextWorkerSeq();
    let cancelled = false;

    // Mark in-flight before postMessage so the banner spinner is visible
    // even if the worker responds in the same task.
    setState({ result: null, isAnalysing: true });

    const onMessage = (e: MessageEvent<TransformResponse>) => {
      const data = e.data;
      if (data.kind !== "transform") return;
      if (data.id !== id) return; // stale: a newer request superseded us
      if (cancelled) return;
      if (data.ok) {
        setState({
          result: { output: data.output, transforms: data.transforms },
          isAnalysing: false,
        });
      } else {
        setState({ result: null, isAnalysing: false });
      }
    };

    worker.addEventListener("message", onMessage);
    worker.postMessage({ kind: "transform", id, src: input });

    return () => {
      cancelled = true;
      worker.removeEventListener("message", onMessage);
    };
  }, [input, enabled]);

  return state;
}
