"use client";

import { useEffect, useRef } from "react";
import { del, get, set } from "idb-keyval";
import { toast } from "sonner";

/**
 * Autosave the live editor draft to IndexedDB (same store family as the
 * document history — keeps it off the localStorage budget and on-device).
 *
 * - Saves are debounced and size-capped so large pastes don't thrash IDB.
 * - Restored once on mount, but only when the editor is empty and there's
 *   no share-link to honour (we never fight an explicit `#d=` token).
 * - An empty editor clears the draft so a reload doesn't resurrect it.
 */

const KEY = "json-formatter:draft";
const MAX_CHARS = 1_000_000; // ~1 MB — skip persisting anything bigger
const DEBOUNCE_MS = 600;

export function useDraftAutosave(
  input: string,
  setInput: (v: string) => void,
  skipRestore: boolean,
) {
  const inputRef = useRef(input);
  // Keep the latest input in a ref (written in an effect, not during
  // render) so the async restore can re-check emptiness after its await.
  useEffect(() => {
    inputRef.current = input;
  }, [input]);
  const ranRestore = useRef(false);

  // Restore once on mount.
  useEffect(() => {
    if (ranRestore.current) return;
    ranRestore.current = true;
    if (skipRestore || input.trim().length > 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const saved = await get<string>(KEY);
        // Re-check emptiness: the user may have typed during the await.
        if (cancelled || !saved || inputRef.current.trim().length > 0) return;
        setInput(saved);
        toast.message("Restored your last session", {
          description: "Your previous draft was still here.",
        });
      } catch {
        /* IDB unavailable (private mode etc.) — silently skip */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Mount-only; deps intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save on every change.
  useEffect(() => {
    const id = setTimeout(() => {
      if (input.length === 0) {
        void del(KEY).catch(() => {});
        return;
      }
      if (input.length > MAX_CHARS) return;
      void set(KEY, input).catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [input]);
}
