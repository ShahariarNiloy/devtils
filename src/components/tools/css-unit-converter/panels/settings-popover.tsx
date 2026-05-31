"use client";

import { Settings2 } from "lucide-react";
import { Input } from "@/components/primitives/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/primitives/popover";

/**
 * Holds the precision selector and the viewport size inputs (for vw/vh
 * conversions). Smaller-impact settings than the base font-size, which has
 * its own dedicated chip; these tuck behind a single cog so they're
 * available without crowding the header.
 */
export function SettingsPopover({
  viewportWidth,
  onViewportWidth,
  viewportHeight,
  onViewportHeight,
  precision,
  onPrecision,
}: {
  viewportWidth: number;
  onViewportWidth: (n: number) => void;
  viewportHeight: number;
  onViewportHeight: (n: number) => void;
  precision: number;
  onPrecision: (n: number) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Settings"
        >
          <Settings2 size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
              Precision
            </label>
            <select
              value={precision}
              onChange={(e) => onPrecision(parseInt(e.target.value, 10))}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-text focus:border-brand focus:outline-none"
            >
              {[2, 3, 4, 5, 6].map((p) => (
                <option key={p} value={p}>{p} dp</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
              Viewport (for vw / vh)
            </label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                min={100}
                value={viewportWidth}
                onChange={(e) => onViewportWidth(parseFloat(e.target.value) || 0)}
                className="h-9 flex-1 font-mono text-sm"
                aria-label="Viewport width"
              />
              <span className="text-xs text-text-faint">×</span>
              <Input
                type="number"
                min={100}
                value={viewportHeight}
                onChange={(e) => onViewportHeight(parseFloat(e.target.value) || 0)}
                className="h-9 flex-1 font-mono text-sm"
                aria-label="Viewport height"
              />
              <span className="text-xs text-text-faint">px</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
