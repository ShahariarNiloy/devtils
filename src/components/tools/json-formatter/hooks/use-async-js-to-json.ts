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
 * Debounced + sticky:
 * - The detection only runs once the user *pauses* typing (`DEBOUNCE_MS`),
 *   so it never fires per-keystroke.
 * - Crucially, an already-shown result is NOT cleared while you keep typing.
 *   The banner stays put; once you pause we re-check and either replace it
 *   with the fresh conversion or hide it if the input no longer converts.
 *   (Earlier we cleared on every change, which made the banner vanish
 *   mid-type and pop back on pause — that's the churn this avoids.)
 *
 * Because the banner is sticky, the worker-computed result can lag a few
 * keystrokes behind what's on screen. Apply guards against that by
 * recomputing synchronously on the current input (see use-json-state).
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

    // NOTE: we deliberately do NOT clear the existing result here. Keeping it
    // means the banner stays visible while the user types; it's only ever
    // replaced/hidden by the debounced re-check below.

    let cancelled = false;
    let removeListener: (() => void) | null = null;

    const timer = setTimeout(() => {
      if (cancelled) return;
      const worker = getJsonWorker();
      const id = nextWorkerSeq();
      // Only show the "analysing" state when there's nothing on screen yet —
      // never flash it over an already-visible banner.
      setState((s) => ({ result: s.result, isAnalysing: s.result === null }));

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
          // Re-check says it no longer converts → hide the banner.
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
