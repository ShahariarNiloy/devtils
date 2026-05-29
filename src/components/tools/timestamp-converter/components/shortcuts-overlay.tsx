"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";

const SHORTCUTS: [string, string][] = [
  ["⌘ K", "Focus the input"],
  ["⌘ ↵", "Insert current timestamp"],
  ["⌘ ⇧ T", "Swap primary / secondary timezones"],
  ["⌘ L", "Copy permalink"],
  ["⌘ C", "Copy primary ISO 8601"],
  ["Esc", "Clear input"],
  ["?", "Toggle this help"],
  ["⌘ 1–4", "Switch mode (Single / Compare / Arithmetic / Batch)"],
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ShortcutsOverlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(440px,calc(100vw-32px))]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Keyboard shortcuts
          </DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-1 px-5 pb-5">
          {SHORTCUTS.map(([keys, label]) => (
            <li
              key={keys}
              className="flex items-center justify-between gap-4 py-1.5 text-sm"
            >
              <span className="text-text-muted">{label}</span>
              <kbd className="rounded border border-border-subtle bg-surface-soft px-1.5 py-0.5 font-mono text-[12px] text-text">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
