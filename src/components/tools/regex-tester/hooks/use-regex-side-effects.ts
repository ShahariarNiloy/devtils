"use client";

import { useEffect } from "react";
import {
  HISTORY_MAX,
  loadHistory,
  saveHistory,
  loadSavedText,
  saveText,
  type HistoryEntry,
  SAMPLE_TEXT,
} from "./use-regex-state";

interface HydrationArgs {
  setPattern: (s: string) => void;
  setFlags: (f: string[]) => void;
  setText: (s: string) => void;
  setHistory: (h: HistoryEntry[]) => void;
}

/**
 * Hydrates pattern, flags, and text from the URL search params on first mount,
 * then strips those params from the URL. Also restores previously saved text
 * from localStorage when no URL params are present.
 */
export function useHydration({
  setPattern,
  setFlags,
  setText,
  setHistory,
}: HydrationArgs) {
  useEffect(() => {
    setHistory(loadHistory());
    const params = new URLSearchParams(window.location.search);
    const p = params.get("p");
    const f = params.get("f");
    const t = params.get("t");
    if (p)          setPattern(p);
    if (f !== null) setFlags(f.split("").filter(Boolean));
    if (t) {
      setText(t);
    } else {
      const saved = loadSavedText();
      if (saved !== null) setText(saved);
    }
    if (p || f !== null || t) {
      const url = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", url);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Persists the test text to localStorage 500 ms after the last edit. */
export function useTextPersistence(text: string) {
  useEffect(() => {
    const id = setTimeout(() => saveText(text), 500);
    return () => clearTimeout(id);
  }, [text]);
}

/**
 * Tracks viewport width via a media query and calls `setSplitDirection`
 * with `"horizontal"` on tablet+ or `"vertical"` on mobile.
 */
export function useSplitDirection(
  setSplitDirection: (d: "horizontal" | "vertical") => void,
) {
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = (e: MediaQueryListEvent | MediaQueryList) =>
      setSplitDirection(e.matches ? "horizontal" : "vertical");
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [setSplitDirection]);
}

/**
 * Detects the on-screen keyboard via the VisualViewport API and calls
 * `setIsKeyboardOpen` when it opens or closes.
 * Debounced to avoid flickering on orientation changes.
 */
export function useKeyboardDetection(setIsKeyboardOpen: (open: boolean) => void) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    let pending: number | null = null;
    let last = false;

    function read() {
      const heightDiff = window.innerHeight - vv.height;
      const next = heightDiff > 150;
      if (next !== last) {
        last = next;
        setIsKeyboardOpen(next);
      }
    }

    function schedule() {
      if (pending !== null) window.clearTimeout(pending);
      pending = window.setTimeout(read, 100);
    }

    vv.addEventListener("resize", schedule);
    read();
    return () => {
      vv.removeEventListener("resize", schedule);
      if (pending !== null) window.clearTimeout(pending);
    };
  }, [setIsKeyboardOpen]);
}

interface HistorySaveArgs {
  compiledOk: boolean;
  pattern: string;
  flagsKey: string;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
}

/**
 * Saves valid patterns to history in localStorage 1.5 s after the last edit,
 * deduplicating by pattern + flags combination.
 */
export function useHistorySave({ compiledOk, pattern, flagsKey, setHistory }: HistorySaveArgs) {
  useEffect(() => {
    if (!compiledOk || !pattern || pattern.length < 2) return;
    const id = setTimeout(() => {
      setHistory((prev) => {
        const filtered = prev.filter((h) => !(h.pattern === pattern && h.flags === flagsKey));
        const next = [{ pattern, flags: flagsKey, ts: Date.now() }, ...filtered].slice(0, HISTORY_MAX);
        saveHistory(next);
        return next;
      });
    }, 1500);
    return () => clearTimeout(id);
  }, [compiledOk, pattern, flagsKey, setHistory]);
}

export { SAMPLE_TEXT };
