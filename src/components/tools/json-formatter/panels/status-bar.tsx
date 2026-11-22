"use client";

import { BarChart2 } from "lucide-react";
import { useDeferredValue, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/primitives/popover";
import { StatsPanel } from "./stats-panel";
import { countKeys, formatBytes, getDepth } from "../json-formatter.lib";
import { useByteLength } from "../hooks/use-byte-length";
import type { JsonFormatterState } from "../use-json-formatter";

/** Above this, keys/depth are skipped — the walk isn't worth a frame. */
const STATS_LIMIT = 2 * 1024 * 1024;

interface StatusBarProps {
  state: JsonFormatterState;
  isMobile: boolean;
}

const BUSY_TEXT = {
  format: "Formatting…",
  minify: "Minifying…",
  sort: "Sorting keys…",
  repair: "Repairing…",
  validate: "Validating…",
} as const;

/** v2 status bar: validity · size · keys · depth … UTF-8 · Local-only. */
export function StatusBar({ state, isMobile }: StatusBarProps) {
  const v = state.validation;
  const input = useDeferredValue(state.input);
  const bytes = useByteLength(input);
  const parsed = state.parsedValue;
  const shape = useMemo(() => {
    if (v.status !== "valid" || parsed === null || parsed === undefined || bytes > STATS_LIMIT || input.length > STATS_LIMIT) return null;
    return { keys: countKeys(parsed), depth: getDepth(parsed) };
  }, [v.status, parsed, bytes, input.length]);

  const busy = state.busyAction ? BUSY_TEXT[state.busyAction] : null;
  let status: { text: string; tone: string };
  if (v.status === "valid") status = { text: "Valid", tone: "text-success" };
  else if (v.status === "invalid") status = { text: "Invalid JSON", tone: "text-error" };
  else status = { text: state.input.trim() ? "Checking…" : "Waiting for input", tone: "text-text-faint" };

  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
      <span className={status.tone}>● {status.text}</span>
      {busy && (
        <span role="status" className="animate-pulse text-text-muted">
          {busy}
        </span>
      )}
      {/* Size · keys · depth doubles as the Stats trigger: full stats in a
          popover, so nothing in the layout moves. */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={v.status !== "valid"}
            title="Show document stats"
            className="-mx-1.5 inline-flex items-center gap-x-[18px] rounded-md px-1.5 py-0.5 transition-colors enabled:hover:bg-white/6 enabled:hover:text-text-muted disabled:cursor-default"
          >
            <span>{formatBytes(bytes)}</span>
            {shape && <span>{shape.keys} keys</span>}
            {shape && !isMobile && <span>depth {shape.depth}</span>}
            {v.status === "valid" && (
              <span className="inline-flex items-center gap-1 font-sans text-[11.5px] font-semibold">
                <BarChart2 size={12} aria-hidden />
                Stats
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-[min(380px,calc(100vw-32px))]">
          <div className="mb-2.5 text-sm font-semibold text-text">Document stats</div>
          <StatsPanel value={state.parsedOutput ?? state.parsedValue} text={state.output || state.input} />
        </PopoverContent>
      </Popover>
      <span className="grow" />
      {!isMobile && <span>UTF-8</span>}
      <span className="text-success-text">Local-only</span>
    </div>
  );
}
