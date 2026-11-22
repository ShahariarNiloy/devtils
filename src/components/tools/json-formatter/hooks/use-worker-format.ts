"use client";

import { useEffect, useState } from "react";
import type { IndentStyle } from "../json-formatter.types";
import { formatInWorker } from "../json-worker-client";

/** Busy UI appears only for jobs that outlast this — no flash on fast ones. */
export const BUSY_REVEAL_MS = 150;

interface Done {
  src: string;
  indent: IndentStyle;
  /** null: `src` wasn't valid JSON. */
  text: string | null;
}

export interface WorkerFormatted {
  /** Formatted `src`; while a new one is pending, the last good result (or ""). */
  text: string;
  /** A result for the current `src` / `indent` hasn't arrived yet. */
  pending: boolean;
  /** `pending` for longer than BUSY_REVEAL_MS (drives the busy label). */
  busy: boolean;
}

/**
 * Lossless pretty-print of a large document in the JSON worker, for views
 * that only read it (the Code view of an input that wasn't formatted).
 * Results are tagged with their inputs, so a stale answer never shows as
 * current; an empty `src` means "not needed" and costs nothing.
 */
export function useWorkerFormat(src: string, indent: IndentStyle): WorkerFormatted {
  const [done, setDone] = useState<Done | null>(null);
  const [last, setLast] = useState("");
  const [revealed, setRevealed] = useState<{ src: string; indent: IndentStyle } | null>(null);

  useEffect(() => {
    if (!src) return;
    let live = true;
    const t = setTimeout(() => setRevealed({ src, indent }), BUSY_REVEAL_MS);
    void formatInWorker(src, indent).then((text) => {
      if (!live) return;
      clearTimeout(t);
      setDone({ src, indent, text });
      if (text !== null) setLast(text);
    });
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [src, indent]);

  if (!src) return { text: "", pending: false, busy: false };
  const current = done !== null && done.src === src && done.indent === indent;
  if (current) return { text: done.text ?? last, pending: false, busy: false };
  const busy = revealed !== null && revealed.src === src && revealed.indent === indent;
  return { text: last, pending: true, busy };
}
