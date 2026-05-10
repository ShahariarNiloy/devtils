"use client";

import { useMemo, useState } from "react";
import { hexDump } from "../base64.lib";

interface HexDumpViewProps {
  bytes: Uint8Array;
}

const ROW_LIMIT = 256;

export function HexDumpView({ bytes }: HexDumpViewProps) {
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => hexDump(bytes), [bytes]);
  const visible = showAll ? rows : rows.slice(0, ROW_LIMIT);
  const truncated = !showAll && rows.length > ROW_LIMIT;

  if (bytes.length === 0) {
    return (
      <p className="text-sm text-text-faint italic px-3 py-4">No bytes to display.</p>
    );
  }

  return (
    <div className="font-mono text-sm">
      <div className="flex gap-4 px-3 py-1.5 border-b border-border-subtle text-text-faint uppercase tracking-wide">
        <span className="w-20 shrink-0">Offset</span>
        <span className="flex-1">Hex</span>
        <span className="w-24 shrink-0">ASCII</span>
      </div>
      <div className="divide-y divide-border-subtle/50">
        {visible.map((r) => (
          <div key={r.offset} className="flex gap-4 px-3 py-1 hover:bg-surface-soft/40 transition-colors">
            <span className="w-20 shrink-0 text-text-faint">{r.offset}</span>
            <span className="flex-1 text-text">{r.hex}</span>
            <span className="w-24 shrink-0 text-text-muted">{r.ascii}</span>
          </div>
        ))}
      </div>
      {truncated && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 inline-flex h-9 items-center justify-center rounded-button border border-border bg-surface px-3 text-sm font-medium text-text-muted hover:border-border-strong hover:text-text transition-colors cursor-pointer"
        >
          Show all {bytes.length.toLocaleString()} bytes →
        </button>
      )}
    </div>
  );
}
