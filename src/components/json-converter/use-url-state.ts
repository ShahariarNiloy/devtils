"use client";

import { useCallback, useEffect, useState } from "react";

type Codec<T> = {
  encode: (v: T) => string | null;
  decode: (s: string | null) => T;
};

/**
 * String values pass through; null/undefined drop the key from the URL. Falls
 * back to the default value when the param is absent or empty.
 */
export function stringCodec(defaultValue: string): Codec<string> {
  return {
    encode: (v) => (v === defaultValue ? null : v),
    decode: (s) => s ?? defaultValue,
  };
}

/** `1` / `0` for booleans, dropped when matching the default. */
export function booleanCodec(defaultValue: boolean): Codec<boolean> {
  return {
    encode: (v) => (v === defaultValue ? null : v ? "1" : "0"),
    decode: (s) => (s == null ? defaultValue : s === "1" || s === "true"),
  };
}

/** Constrained enum codec — keeps invalid query strings from leaking through. */
export function enumCodec<T extends string>(values: readonly T[], defaultValue: T): Codec<T> {
  const set = new Set<string>(values);
  return {
    encode: (v) => (v === defaultValue ? null : v),
    decode: (s) => (s && set.has(s) ? (s as T) : defaultValue),
  };
}

/**
 * Number codec storing a small integer (or float) as decimal. Values equal to
 * the default are stripped — keeps URLs short.
 */
export function numberCodec(defaultValue: number): Codec<number> {
  return {
    encode: (v) => (v === defaultValue ? null : String(v)),
    decode: (s) => {
      if (s == null) return defaultValue;
      const n = Number(s);
      return Number.isFinite(n) ? n : defaultValue;
    },
  };
}

/**
 * Synchronise React state with a single URL query param. The hook reads the
 * initial value off the URL on mount (so deep-linked options apply), and
 * writes back via `history.replaceState` on every change — so the back/
 * forward stack stays small instead of getting one entry per keystroke.
 *
 * Why replaceState and not the Next.js router: `router.replace` re-runs
 * server components and would refetch metadata; we only need the query string
 * to round-trip locally.
 */
export function useUrlState<T>(
  key: string,
  codec: Codec<T>,
): [T, (next: T) => void] {
  // SSR-safe initial: read default; the URL takes over on mount via the
  // effect below. The first paint matches the server render exactly.
  const [value, setValue] = useState<T>(() => codec.decode(null));

  // Pull the URL value once on mount so deep links / refreshes restore state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    // Mount-time external-state pull from the URL. React's strict rule
    // flags this as a cascading render, but the read IS the external-system
    // sync the rule's docs describe — the URL is the external system here.
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setValue(codec.decode(params.get(key)));
  }, []);

  const setUrlValue = useCallback(
    (next: T) => {
      setValue(next);
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const encoded = codec.encode(next);
      if (encoded === null) params.delete(key);
      else params.set(key, encoded);
      const qs = params.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(window.history.state, "", url);
    },
    [key, codec],
  );

  return [value, setUrlValue];
}
