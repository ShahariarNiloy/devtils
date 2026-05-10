"use client";

import { memo } from "react";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";

// ─── Component ─────────────────────────────────────────────────────────────────

export const SplitPanel = memo(function SplitPanel({ parts }: { parts: string[] }) {
  return (
    <>
      <div className="flex items-center justify-between px-4 h-10 border-b border-border-subtle shrink-0">
        <span className="text-sm font-semibold text-text">
          Parts <span className="text-text-faint font-normal">· {parts.length}</span>
        </span>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(JSON.stringify(parts, null, 2)); toast.success("Copied as JSON"); }}
          className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text transition-colors cursor-pointer"
        >
          <ClipboardCopy size={15} /> JSON
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {parts.map((part, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-2.5 border-b border-border-subtle last:border-b-0 hover:bg-surface-soft/60 transition-colors"
          >
            <span className="font-mono text-sm text-text-faint w-8 shrink-0 pt-px">[{i}]</span>
            <code className="font-mono text-sm text-text break-all flex-1">
              {part === "" ? <span className="text-text-faint/60 italic">empty</span> : part}
            </code>
          </div>
        ))}
      </div>
    </>
  );
});
