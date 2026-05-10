"use client";

import { memo } from "react";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";

// ─── Component ─────────────────────────────────────────────────────────────────

export const ReplacePanel = memo(function ReplacePanel({ replaced }: { replaced: string }) {
  return (
    <>
      <div className="flex items-center justify-between px-4 h-10 border-b border-border-subtle shrink-0">
        <span className="text-sm uppercase tracking-[0.08em] font-medium text-text-faint">Output</span>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(replaced); toast.success("Copied output"); }}
          className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text transition-colors cursor-pointer"
        >
          <ClipboardCopy size={15} /> Copy
        </button>
      </div>
      <pre className="flex-1 px-4 py-3 font-mono text-sm leading-[1.65] text-text whitespace-pre-wrap break-words overflow-auto">
        {replaced || <span className="text-text-faint italic">Output appears here…</span>}
      </pre>
    </>
  );
});
