"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Kbd } from "@/components/primitives/kbd";

export interface Shortcut {
  /** Display label, e.g. "Copy output". */
  label: string;
  /** Keys to render — split per key for the Kbd primitive. */
  keys: string[];
  /** Optional grouping for the overlay layout. */
  group?: string;
}

/**
 * Global keyboard shortcuts. Tools opt in to extending this list via the
 * `useExtendShortcuts` hook below — anything added through that hook
 * surfaces in the overlay without each tool re-implementing the modal.
 */
const GLOBAL_SHORTCUTS: Shortcut[] = [
  { group: "Navigation", label: "Open command palette", keys: ["⌘", "K"] },
  { group: "Navigation", label: "Browse all tools", keys: ["G", "T"] },
  { group: "Navigation", label: "Go home", keys: ["G", "H"] },
  { group: "Help", label: "Show this overlay", keys: ["?"] },
  { group: "Help", label: "Close any overlay", keys: ["Esc"] },
];

let extraShortcuts: Shortcut[] = [];
const subscribers = new Set<() => void>();

/**
 * Used inside a tool component to publish its keyboard shortcuts into the
 * global overlay. Returns nothing — the registration is mounted on
 * useEffect and unmounted on cleanup so each tool's bindings appear only
 * while that tool is on screen.
 */
export function useExtendShortcuts(items: Shortcut[]) {
  useEffect(() => {
    extraShortcuts = items;
    subscribers.forEach((fn) => fn());
    return () => {
      extraShortcuts = [];
      subscribers.forEach((fn) => fn());
    };
  }, [items]);
}

/**
 * Renders nothing by default; opens a centred modal when `?` is pressed
 * outside an editable element. Lists every global shortcut + whatever the
 * current tool published via `useExtendShortcuts`.
 */
export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Subscribe to tool-published shortcut changes so the overlay re-renders
  // when a tool mounts / unmounts. `tick` is a render counter; nothing
  // depends on its value.
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      // `?` opens the overlay — but not if the user is typing into an
      // input / textarea / contenteditable, where the key is meant for
      // literal input.
      if (e.key === "?" && !open) {
        const t = e.target as HTMLElement | null;
        if (t) {
          const tag = t.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable) return;
        }
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const all = [...GLOBAL_SHORTCUTS, ...extraShortcuts];
  const groups = new Map<string, Shortcut[]>();
  for (const s of all) {
    const g = s.group ?? "General";
    const arr = groups.get(g) ?? [];
    arr.push(s);
    groups.set(g, arr);
  }

  // `tick` is only a render trigger — referencing it avoids the unused-var
  // warning while keeping the subscriber path honest.
  void tick;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <div>
            <div className="text-sm uppercase tracking-wider font-semibold text-text-faint">
              Help
            </div>
            <h2 className="text-lg font-semibold text-text">Keyboard shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts overlay"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-2">
          {Array.from(groups.entries()).map(([group, items]) => (
            <div key={group}>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-faint">
                {group}
              </div>
              <div className="flex flex-col gap-1.5">
                {items.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-text-muted">{s.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border-subtle px-5 py-2.5 text-xs text-text-faint">
          Press <Kbd>?</Kbd> any time to bring this back · <Kbd>Esc</Kbd> to close.
        </div>
      </div>
    </div>
  );
}
