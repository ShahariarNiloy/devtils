"use client";

import { useEffect, useMemo, useState } from "react";
import { scanJsonText } from "../json-lossless";
import { scanInWorker, WORKER_THRESHOLD } from "../json-worker-client";

/**
 * How many numbers in `src` JavaScript can't represent exactly (they show
 * rounded in Tree / Table / Graph / Path). Small texts scan synchronously;
 * large ones scan in the JSON worker so the 50 MB pass never blocks a frame.
 * The last count stays until the new one lands (stale-while-revalidate).
 * An empty `src` means "not needed" and reports 0.
 */
export function useImpreciseCount(src: string): number {
  const small = src.length <= WORKER_THRESHOLD;
  const sync = useMemo(() => {
    if (!small) return null;
    return src ? scanJsonText(src).impreciseNumbers : 0;
  }, [src, small]);
  const [asyncCount, setAsyncCount] = useState(0);

  useEffect(() => {
    if (small) return;
    let live = true;
    void scanInWorker(src).then((n) => {
      if (live) setAsyncCount(n);
    });
    return () => {
      live = false;
    };
  }, [src, small]);

  return sync ?? asyncCount;
}
