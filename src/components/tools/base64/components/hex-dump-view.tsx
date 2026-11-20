"use client";

import { useMemo, useState } from "react";
import { hexDump } from "../base64.lib";

interface HexDumpViewProps {
  bytes: Uint8Array;
}

const ROW_LIMIT = 256;

/** offset · hex · ASCII rows of the result bytes. */
export function HexDumpView({ bytes }: HexDumpViewProps) {
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => hexDump(bytes), [bytes]);
  const visible = showAll ? rows : rows.slice(0, ROW_LIMIT);
  const truncated = !showAll && rows.length > ROW_LIMIT;

  if (bytes.length === 0) {
    return <p className="m-0 p-4 text-[13px] text-text-ghost">No bytes to show.</p>;
  }

  return (
    <div className="min-w-max py-2 font-mono text-[12px] leading-[1.75]">
      <div className="flex gap-4 px-4 pb-1 text-[11px] tracking-wide text-text-ghost uppercase">
        <span className="w-[72px] shrink-0">Offset</span>
        <span className="w-[23.5rem] shrink-0">Hex</span>
        <span className="shrink-0">ASCII</span>
      </div>
      {visible.map((r) => (
        <div key={r.offset} className="flex gap-4 px-4 hover:bg-white/3">
          <span className="w-[72px] shrink-0 text-text-ghost">{r.offset}</span>
          <span className="w-[23.5rem] shrink-0 text-syntax-plain">{r.hex}</span>
          <span className="shrink-0 whitespace-pre text-text-tertiary">{r.ascii}</span>
        </div>
      ))}
      {truncated && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mx-4 mt-2 inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-border px-2.5 font-sans text-xs font-semibold text-text-key transition-colors hover:bg-white/6"
        >
          Show all {bytes.length.toLocaleString()} bytes
        </button>
      )}
    </div>
  );
}
