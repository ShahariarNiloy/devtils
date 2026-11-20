"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/primitives/dialog";
import { useRegisteredShortcuts, useShortcut, type RegisteredShortcut } from "@/lib/keyboard";

const OPEN_EVENT = "utilyx:open-shortcuts";

/** Open the shortcuts sheet from anywhere (e.g. the ⌘K palette footer). */
export function openShortcutsSheet() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Keys the sheet itself owns; everything else comes from the live registry. */
const SHEET_KEYS: Omit<RegisteredShortcut, "id">[] = [
  { label: "Show shortcuts", group: "Anywhere", keys: ["?"] },
  { label: "Close dialog", group: "Anywhere", keys: ["esc"] },
];

/** Section order: Anywhere first, then whatever the page registered. */
function groupShortcuts(items: Omit<RegisteredShortcut, "id">[]) {
  const map = new Map<string, Omit<RegisteredShortcut, "id">[]>();
  for (const s of items) {
    const seen = map.get(s.group) ?? [];
    // One row per label+keys, even if two components registered it.
    if (!seen.some((x) => x.label === s.label && x.keys.join() === s.keys.join())) seen.push(s);
    map.set(s.group, seen);
  }
  return [...map.entries()].sort(([a], [b]) => (a === "Anywhere" ? -1 : b === "Anywhere" ? 1 : 0));
}

/**
 * v2 keyboard-shortcuts sheet, opened with `?` (outside text fields) or from
 * the palette. Lists only shortcuts that are live on the current page:
 * everything comes from `useShortcut({ label })` registrations.
 */
export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const registered = useRegisteredShortcuts();

  useShortcut({ key: "?", shift: true }, (e) => {
    e.preventDefault();
    setOpen(true);
  });
  // Some layouts report "?" without Shift (e.g. dedicated key); accept both.
  useShortcut({ key: "?" }, (e) => {
    e.preventDefault();
    setOpen(true);
  });
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const groups = groupShortcuts([...SHEET_KEYS, ...registered]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        aria-describedby={undefined}
        className="top-1/2 max-h-[86dvh] w-[min(780px,calc(100vw-32px))] -translate-y-1/2 overflow-y-auto p-[22px] sm:w-[min(780px,calc(100vw-96px))]"
      >
        <DialogTitle className="m-0 mb-[18px] pr-12 font-sans text-xl font-bold tracking-[-0.02em]">Keyboard shortcuts</DialogTitle>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-7 gap-y-[18px]">
          {groups.map(([title, items]) => (
            <section key={title} aria-label={title} className="flex flex-col gap-0.5">
              <h3 className="m-0 mb-1.5 font-sans text-xs font-bold tracking-normal text-text-faint">{title}</h3>
              {items.map((s) => (
                <div key={s.label + s.keys.join()} className="flex min-h-10 items-center gap-3 border-b border-white/[.05]">
                  <span className="grow text-sm text-text-key">{s.label}</span>
                  <span className="flex gap-1">
                    {s.keys.map((k) => (
                      <kbd key={k} className="surface-key inline-flex h-[26px] min-w-[26px] items-center justify-center rounded-[6px] px-1.5 font-mono text-xs text-text">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </section>
          ))}
        </div>
        <p className="m-0 mt-[18px] text-[13px] text-text-faint">On Windows and Linux, use Ctrl instead of ⌘.</p>
      </DialogContent>
    </Dialog>
  );
}
