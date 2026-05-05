"use client";

import { useEffect } from "react";

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
}

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
}

/** True when running on macOS in the browser. */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
