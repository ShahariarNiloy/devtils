"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Page thumbnails, outside React state. Each tile subscribes to its own key,
 * so a finished thumbnail re-renders that one tile — not a 3,000-page grid.
 */
export class ThumbStore {
  private urls = new Map<string, string>();
  private subs = new Map<string, Set<() => void>>();

  get = (key: string): string | undefined => this.urls.get(key);
  has = (key: string): boolean => this.urls.has(key);

  set(key: string, url: string): void {
    this.urls.set(key, url);
    for (const fn of this.subs.get(key) ?? []) fn();
  }

  /** Drop thumbnails whose key matches, revoking their object URLs. */
  drop(match: (key: string) => boolean): void {
    for (const [key, url] of this.urls) {
      if (!match(key)) continue;
      URL.revokeObjectURL(url);
      this.urls.delete(key);
      for (const fn of this.subs.get(key) ?? []) fn();
    }
  }

  subscribe(key: string, fn: () => void): () => void {
    let set = this.subs.get(key);
    if (!set) this.subs.set(key, (set = new Set()));
    set.add(fn);
    return () => {
      set.delete(fn);
      if (!set.size) this.subs.delete(key);
    };
  }
}

/** One tile's thumbnail URL; re-renders only when that thumbnail changes. */
export function useThumb(store: ThumbStore, key: string | null): string | undefined {
  const subscribe = useCallback((fn: () => void) => (key ? store.subscribe(key, fn) : () => {}), [store, key]);
  const read = useCallback(() => (key ? store.get(key) : undefined), [store, key]);
  return useSyncExternalStore(subscribe, read, () => undefined);
}
