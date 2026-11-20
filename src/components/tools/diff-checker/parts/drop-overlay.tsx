"use client";

import { FileText } from "lucide-react";

/**
 * Overlay shown while files are being dragged over the workspace. Sits
 * absolutely positioned on top of the diff so it doesn't reflow the
 * layout when it appears.
 *
 * Counter-based show/hide lives in the parent — this component is just
 * a presentational shell driven by `visible`.
 */
export function DropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[14px] bg-bg/80 backdrop-blur-sm sm:rounded-[18px]">
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border-strong bg-surface px-8 py-6 shadow-window-tool">
        <FileText size={28} className="text-clay-light" aria-hidden />
        <p className="text-[15px] font-semibold text-text">Drop two files to compare</p>
        <p className="font-mono text-xs text-text-faint">
          first → Original · second → Changed
        </p>
      </div>
    </div>
  );
}
