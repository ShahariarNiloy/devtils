"use client";

import { useSyncExternalStore } from "react";

/** Mockup's mobile frame applies below the `sm` breakpoint (640px). */
const NARROW_QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * True on phone-width viewports. Server render (and the first client paint)
 * assume desktop, so the markup matches before hydration.
 */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}
