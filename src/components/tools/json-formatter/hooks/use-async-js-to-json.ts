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
  /** The input this result was computed for — guards Apply against acting on
   *  a stale conversion if the input changed after the result landed. */
  forInput: string;
}

export interface AsyncTransformState {
  /** Non-null only when the worker returned a successful conversion for the
   *  current `enabled + input` pair. Cleared the moment `enabled` flips off
   *  or input changes — no stale banners. */
  result: AsyncTransformResult | null;
  /** True only while a dispatched request is in flight (after the debounce
   *  has fired). Drives the "Analysing…" spinner for genuinely large inputs. */
  isAnalysing: boolean;
}

/** How long the user must pause typing before we evaluate JS→JSON. */
const DEBOUNCE_MS = 400;

/**
 * Detect a JS-object-shaped input and offer a JSON conversion, off the main
 * thread via the shared JSON worker.
 *
 * Debounced on purpose: the detection only runs once the user *pauses*
 * typing (`DEBOUNCE_MS`). Earlier this fired on every keystroke and flashed
 * an "Analysing…" state each time, which read as the banner flickering
 * show/hide as you typed. Now the banner is simply absent while you type and
 * settles in shortly after you stop — no per-keystroke churn.
 *
 * While the debounce is pending we clear any previous result, so a stale
 * conversion can never be shown (or Applied) for input you've since edited.
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ result: null, isAnalysing: false });
      return;
    }

    // Input changed (or just became enabled): drop any prior result so the
    // banner doesn't show a conversion for text the user has moved past.
    // No `isAnalysing` flash here — that was the flicker.
    setState({ result: null, isAnalysing: false });

    let cancelled = false;
    let removeListener: (() => void) | null = null;

    const timer = setTimeout(() => {
      if (cancelled) return;
      const worker = getJsonWorker();
      const id = nextWorkerSeq();
      setState({ result: null, isAnalysing: true });

      const onMessage = (e: MessageEvent<TransformResponse>) => {
        const data = e.data;
        if (data.kind !== "transform") return;
        if (data.id !== id) return; // stale: a newer request superseded us
        if (cancelled) return;
        if (data.ok) {
          setState({
            result: { output: data.output, transforms: data.transforms, forInput: input },
            isAnalysing: false,
          });
        } else {
          setState({ result: null, isAnalysing: false });
        }
      };

      worker.addEventListener("message", onMessage);
      removeListener = () => worker.removeEventListener("message", onMessage);
      worker.postMessage({ kind: "transform", id, src: input });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      removeListener?.();
    };
  }, [input, enabled]);

  return state;
}
