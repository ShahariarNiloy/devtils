"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
  dstWarning: { tz: string; transitionAt: string } | null;
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-text-faint">
      <kbd className="rounded border border-border-subtle bg-surface-soft px-1 font-mono text-[11px]">
        {keys}
      </kbd>
      {label}
    </span>
  );
}

export function StatusBar({ dstWarning }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-subtle px-1 py-2 text-sm">
      <div className="flex items-center gap-4">
        <Hint keys="?" label="shortcuts" />
        <Hint keys="⌘L" label="permalink" />
        <Hint keys="⌘⇧T" label="swap zones" />
      </div>
      {dstWarning && (
        <span className="ml-auto inline-flex items-center gap-1.5 text-clay">
          <AlertTriangle size={14} aria-hidden />
          DST transition near {dstWarning.tz} ({dstWarning.transitionAt})
        </span>
      )}
    </div>
  );
}
