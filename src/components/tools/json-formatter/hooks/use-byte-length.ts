"use client";

import { useEffect, useMemo, useState } from "react";
import { byteLength } from "../json-formatter.lib";
import { byteLengthSteps } from "../json-sliced.lib";
import { WORKER_THRESHOLD } from "../json-worker-client";
import { runSliced } from "../run-sliced";

/**
 * UTF-8 size of `text` for the status bar. Small texts count synchronously;
 * large ones in short slices (a one-shot count of 50 MB was ~100 ms on the
 * main thread, paid on every paste / format). The last count stays until
 * the new one lands.
 */
export function useByteLength(text: string): number {
  const small = text.length <= WORKER_THRESHOLD;
  const sync = useMemo(() => (small ? byteLength(text) : null), [text, small]);
  const [counted, setCounted] = useState(0);
  useEffect(() => {
    if (small) return;
    const job = runSliced(byteLengthSteps(text));
    void job.promise.then(setCounted);
    return job.cancel;
  }, [text, small]);
  return sync ?? counted;
}
