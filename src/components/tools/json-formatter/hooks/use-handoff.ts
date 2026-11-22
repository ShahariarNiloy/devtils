"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { stashHandoffInput } from "@/components/json-converter";
import { flushPendingEdits } from "@/components/primitives/code-editor";
import { formatJsonText } from "../json-formatter.lib";
import { formatInWorker, WORKER_THRESHOLD } from "../json-worker-client";
import type { JsonFormatterState } from "../use-json-formatter";
import { BUSY_REVEAL_MS } from "./use-worker-format";

/** Handoff text for a dedicated tool: the source text, formatted losslessly. */
export function handoffText(input: string): string {
  try {
    return formatJsonText(input, "2", "none");
  } catch {
    return input;
  }
}

/** Large documents format in the worker; same bytes as `handoffText`. */
async function handoffTextAsync(input: string): Promise<string> {
  if (input.length <= WORKER_THRESHOLD) return handoffText(input);
  return (await formatInWorker(input, "2")) ?? input;
}

// Only the latest click may navigate (module-level: the menu row that
// started it can unmount while the job runs).
let seq = 0;

/**
 * "Open in dedicated tool": hand the live input (formatted) to `/tools/<slug>`
 * and navigate. Small inputs go synchronously; large ones format off the main
 * thread first, with `busySlug` set once that outlasts BUSY_REVEAL_MS. A newer
 * click, or an edit to the input meanwhile, abandons the older one.
 */
export function useHandoff(state: Pick<JsonFormatterState, "getLatestInput">) {
  const router = useRouter();
  const { getLatestInput } = state;
  const [pending, setPending] = useState<{ id: number; slug: string } | null>(null);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setRevealed(pending.id), BUSY_REVEAL_MS);
    return () => clearTimeout(t);
  }, [pending]);

  /** Stash synchronously when that's cheap; true when it was done. */
  const stashNow = useCallback((): boolean => {
    flushPendingEdits();
    const input = getLatestInput();
    if (input.length > WORKER_THRESHOLD) return false;
    ++seq;
    setPending(null);
    const text = handoffText(input);
    if (text.trim()) stashHandoffInput(text);
    return true;
  }, [getLatestInput]);

  const open = useCallback(
    (slug: string) => {
      if (stashNow()) {
        router.push(`/tools/${slug}`);
        return;
      }
      const input = getLatestInput();
      const id = ++seq;
      setPending({ id, slug });
      void handoffTextAsync(input).then((text) => {
        setPending((p) => (p && p.id === id ? null : p));
        if (id !== seq || getLatestInput() !== input) return;
        if (text.trim()) stashHandoffInput(text);
        router.push(`/tools/${slug}`);
      });
    },
    [stashNow, getLatestInput, router],
  );

  const busySlug = pending && revealed === pending.id ? pending.slug : null;
  return { open, stashNow, busySlug, pendingSlug: pending?.slug ?? null };
}
