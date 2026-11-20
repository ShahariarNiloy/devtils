"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutDescriptor {
  /** Key without modifiers, lowercased. e.g. "k", "enter", "escape" */
  key: string;
  /** Require ⌘ on macOS or Ctrl elsewhere. */
  meta?: boolean;
  /** Require Shift modifier. */
  shift?: boolean;
  /** Require Alt/Option modifier. */
  alt?: boolean;
  /** Skip when target is editable (input/textarea/contentEditable). Default true unless meta is set. */
  ignoreInEditable?: boolean;
  /**
   * Human label ("Copy output"). When set, the shortcut is listed in the
   * keyboard-shortcuts sheet while it's mounted and enabled — so the sheet
   * only ever shows shortcuts that actually work on the current page.
   */
  label?: string;
  /** Sheet section. Defaults to "In this tool". */
  group?: string;
}

// ── Shortcut registry (feeds the shortcuts sheet) ──────────────────────────

export interface RegisteredShortcut {
  id: number;
  label: string;
  group: string;
  keys: string[];
}

const KEY_GLYPHS: Record<string, string> = {
  enter: "↵",
  escape: "esc",
  backspace: "⌫",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  " ": "Space",
};

/** Display keys for a descriptor: ["⌘", "⇧", "C"]. */
export function shortcutKeys(d: Pick<ShortcutDescriptor, "key" | "meta" | "shift" | "alt">): string[] {
  const keys: string[] = [];
  if (d.meta) keys.push("⌘");
  if (d.alt) keys.push("⌥");
  if (d.shift) keys.push("⇧");
  const k = d.key.toLowerCase();
  keys.push(KEY_GLYPHS[k] ?? (k.length === 1 ? k.toUpperCase() : d.key));
  return keys;
}

let registry: RegisteredShortcut[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function register(entry: Omit<RegisteredShortcut, "id">): () => void {
  const id = nextId++;
  registry = [...registry, { ...entry, id }];
  emit();
  return () => {
    registry = registry.filter((r) => r.id !== id);
    emit();
  };
}

/** Live list of labelled shortcuts on the current page. */
export function useRegisteredShortcuts(): RegisteredShortcut[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => registry,
    () => EMPTY,
  );
}
const EMPTY: RegisteredShortcut[] = [];

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    el.isContentEditable ||
    el.getAttribute("role") === "textbox"
  );
};

/**
 * Subscribe to a global keyboard shortcut. Cross-platform: `meta` matches ⌘ on
 * macOS and Ctrl on Windows/Linux.
 */
export function useShortcut(
  descriptor: ShortcutDescriptor,
  handler: ShortcutHandler,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key !== descriptor.key.toLowerCase()) return;

      const wantsMeta = !!descriptor.meta;
      const hasMeta = e.metaKey || e.ctrlKey;
      if (wantsMeta !== hasMeta) return;

      const wantsShift = !!descriptor.shift;
      if (wantsShift !== e.shiftKey) return;

      const wantsAlt = !!descriptor.alt;
      if (wantsAlt !== e.altKey) return;

      const ignoreInEditable = descriptor.ignoreInEditable ?? !descriptor.meta;
      if (ignoreInEditable && isEditable(e.target)) return;

      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [descriptor.key, descriptor.meta, descriptor.shift, descriptor.alt, descriptor.ignoreInEditable, handler, enabled]);

  const { label, group, key, meta, shift, alt } = descriptor;
  useEffect(() => {
    if (!enabled || !label) return;
    return register({ label, group: group ?? "In this tool", keys: shortcutKeys({ key, meta, shift, alt }) });
  }, [enabled, label, group, key, meta, shift, alt]);
}

/** True when running on macOS in the browser. */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
