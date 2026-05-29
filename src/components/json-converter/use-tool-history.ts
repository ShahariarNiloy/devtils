"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "devtils:history:";
const MAX_ENTRIES = 5;
/** Items larger than this are skipped — keeps localStorage bounded. */
const MAX_ENTRY_BYTES = 50_000;

export interface HistoryEntry {
  /** Truncated preview shown in the recent-items dropdown. */
  preview: string;
  /** Full stored input (capped by MAX_ENTRY_BYTES). */
  value: string;
  /** Unix ms timestamp; used purely for sort + display. */
  ts: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  push: (value: string) => void;
  load: (entry: HistoryEntry) => string;
  clear: () => void;
}

/**
 * Per-tool localStorage-backed recent inputs. Each tool key namespaces the
 * storage so the JSON formatter's history doesn't bleed into the regex
 * tester's. Cheap to wire up: tool calls `push(value)` whenever an input
 * is committed (Format pressed, Convert pressed, etc.) and reads from
 * `entries` for the dropdown.
 *
 * Deliberately doesn't auto-record every keystroke — that would fill the
 * list with half-typed garbage. Tools decide when an input is meaningful.
 */
export function useToolHistory(slug: string): HistoryState {
  const storageKey = `${STORAGE_PREFIX}${slug}`;
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEntries(JSON.parse(raw) as HistoryEntry[]);
      }
    } catch {
      // Corrupt JSON / quota issues — fall back to empty.
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: HistoryEntry[]) => {
      setEntries(next);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // QuotaExceeded — silent. Returning visitor still gets in-memory.
      }
    },
    [storageKey],
  );

  const push = useCallback(
    (value: string) => {
      const v = value.trim();
      if (!v || v.length > MAX_ENTRY_BYTES) return;
      // Dedupe consecutive saves of the same input; otherwise pressing
      // Format twice would shove two identical entries in.
      setEntries((prev) => {
        const dedup = prev.filter((e) => e.value !== v);
        const next: HistoryEntry[] = [
          { value: v, preview: v.slice(0, 80), ts: Date.now() },
          ...dedup,
        ].slice(0, MAX_ENTRIES);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            /* QuotaExceeded — silent */
          }
        }
        return next;
      });
    },
    [storageKey],
  );

  const load = useCallback((entry: HistoryEntry) => entry.value, []);

  const clear = useCallback(() => persist([]), [persist]);

  return { entries, push, load, clear };
}
