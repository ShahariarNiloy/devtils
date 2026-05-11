"use client";

import { useCallback, useEffect, useState } from "react";
import { del, get, keys as idbKeys, set } from "idb-keyval";
import { byteLength } from "../json-formatter.lib";

/**
 * IDB-backed document history. Replaces the previous localStorage-bound
 * "recent" list (6 entries, 256 KB cap) with a 50-entry log that survives
 * page reloads and tab restarts without bloating the localStorage budget.
 *
 * Storage layout (deliberately split so we don't pull every body into memory
 * on mount — the metadata array is what drives the UI list):
 *   - `${KEY_META}`             → HistoryEntry[]   (max 50, cheap to load)
 *   - `${KEY_BODY_PREFIX}<id>`  → string           (full content, one per entry, lazy)
 *
 * Hash + dedupe: each push computes a cheap cyrb53 hash of the raw content,
 * which doubles as the dedupe key (same content → same hash → existing entry
 * is bumped to top instead of duplicated).
 */

const KEY_META = "json-formatter:history:meta";
const KEY_BODY_PREFIX = "json-formatter:history:body:";

const MAX_ENTRIES = 50;
/** Skip storing pastes larger than this — keeps IDB quota healthy. */
const MAX_STORE_BYTES = 2 * 1024 * 1024;
const PREVIEW_LEN = 80;

const LEGACY_LS_KEY = "json-formatter:recent";

export interface HistoryEntry {
  id: string;
  name: string;
  hash: string;
  snippet: string;
  bytes: number;
  ts: number;
}

// ── Hash ──────────────────────────────────────────────────────────────────────
// cyrb53 — fast 53-bit string hash, ~5-10x faster than SubtleCrypto for short
// strings and synchronous (no Promise plumbing required at the call site).
// MIT, attributed to bryc on stackoverflow.

function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch: number; i < str.length; i += 1) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePreview(raw: string): string {
  const stripped = raw.replace(/\s+/g, " ").trim();
  return stripped.length > PREVIEW_LEN
    ? stripped.slice(0, PREVIEW_LEN) + "…"
    : stripped;
}

function bodyKey(id: string): string {
  return `${KEY_BODY_PREFIX}${id}`;
}

async function migrateFromLocalStorage(): Promise<HistoryEntry[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const seen = new Set<string>();
    const meta: HistoryEntry[] = [];
    for (const e of parsed) {
      if (
        typeof e?.id !== "string" ||
        typeof e?.name !== "string" ||
        typeof e?.content !== "string"
      ) continue;
      const hash = cyrb53(e.content);
      if (seen.has(hash)) continue;
      seen.add(hash);
      meta.push({
        id: e.id,
        name: e.name,
        hash,
        snippet: typeof e.snippet === "string" ? e.snippet : makePreview(e.content),
        bytes: typeof e.bytes === "number" ? e.bytes : byteLength(e.content),
        ts: typeof e.ts === "number" ? e.ts : Date.now(),
      });
      // Persist the body in parallel — fire and forget; we don't block on it.
      void set(bodyKey(e.id), e.content);
    }
    if (meta.length > 0) await set(KEY_META, meta);
    window.localStorage.removeItem(LEGACY_LS_KEY);
    return meta;
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHistory() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  // One-shot hydration from IDB. Doesn't block initial paint — the Recent
  // card just shows "Nothing yet" until this resolves (typically <10 ms).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await get<HistoryEntry[]>(KEY_META);
        if (stored && Array.isArray(stored)) {
          if (!cancelled) setItems(stored);
        } else {
          const migrated = await migrateFromLocalStorage();
          if (migrated && !cancelled) setItems(migrated);
        }
      } catch { /* IDB unavailable — degrade silently */ }
      finally { if (!cancelled) setReady(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  /** Persist the in-memory items array to IDB. Caller passes the next state
   *  so we never read-modify-write the array twice. */
  const persist = useCallback(async (next: HistoryEntry[]) => {
    try { await set(KEY_META, next); } catch { /* ignore */ }
  }, []);

  const push = useCallback(
    (raw: string, name?: string) => {
      if (!raw.trim()) return;
      const bytes = byteLength(raw);
      if (bytes > MAX_STORE_BYTES) return;
      const hash = cyrb53(raw);
      const id = `${Date.now().toString(36)}-${hash.slice(0, 6)}`;
      const snippet = makePreview(raw);

      setItems((prev) => {
        // Drop any existing entry with this hash (same content) before we
        // unshift the new one — keeps the list dedup'd without forcing the
        // user to think about it.
        const filtered = prev.filter((e) => e.hash !== hash);
        const dropped = prev.find((e) => e.hash === hash);
        const next: HistoryEntry[] = [
          { id, name: name ?? "Untitled", hash, snippet, bytes, ts: Date.now() },
          ...filtered,
        ].slice(0, MAX_ENTRIES);

        // Track ids that fell off the cap so we can clean their bodies.
        const trimmed = prev.slice(MAX_ENTRIES - 1).map((e) => e.id);
        const expired = [
          ...(dropped ? [dropped.id] : []),
          ...trimmed.filter((tid) => !next.some((n) => n.id === tid)),
        ];

        // Fire-and-forget IDB writes — UI does not wait on disk.
        void set(bodyKey(id), raw);
        void persist(next);
        for (const eid of expired) void del(bodyKey(eid));

        return next;
      });
    },
    [persist],
  );

  /** Fetch the full body for an entry. The body is not held in React state to
   *  keep the metadata array light; we read it from IDB on demand. */
  const getBody = useCallback(async (id: string): Promise<string | null> => {
    try {
      const body = await get<string>(bodyKey(id));
      return body ?? null;
    } catch { return null; }
  }, []);

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((e) => e.id !== id);
        void persist(next);
        void del(bodyKey(id));
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(async () => {
    const prev = items;
    setItems([]);
    try {
      await set(KEY_META, []);
      // Bodies of just-removed entries — best-effort cleanup.
      await Promise.all(prev.map((e) => del(bodyKey(e.id))));
      // Belt-and-braces: sweep any orphaned bodies left from older sessions.
      const allKeys = await idbKeys();
      const orphans = allKeys.filter(
        (k) => typeof k === "string" && k.startsWith(KEY_BODY_PREFIX),
      );
      await Promise.all(orphans.map((k) => del(k as string)));
    } catch { /* ignore */ }
  }, [items]);

  return { items, ready, push, getBody, remove, clear };
}
