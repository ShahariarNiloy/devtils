"use client";

import { useDeferredValue, useMemo } from "react";
import { byteLength, countKeys, formatBytes, getDepth } from "../json-formatter.lib";
import type { JsonFormatterState } from "../use-json-formatter";

/** Above this, keys/depth are skipped — the walk isn't worth a frame. */
const STATS_LIMIT = 2 * 1024 * 1024;

interface StatusBarProps {
  state: JsonFormatterState;
  isMobile: boolean;
}

/** v2 status bar: validity · size · keys · depth … UTF-8 · Local-only. */
export function StatusBar({ state, isMobile }: StatusBarProps) {
  const v = state.validation;
  const input = useDeferredValue(state.input);
  const bytes = useMemo(() => byteLength(input), [input]);
  const parsed = state.parsedValue;
  const shape = useMemo(() => {
    if (v.status !== "valid" || parsed === null || parsed === undefined || bytes > STATS_LIMIT) return null;
    return { keys: countKeys(parsed), depth: getDepth(parsed) };
  }, [v.status, parsed, bytes]);

  let status: { text: string; tone: string };
  if (v.status === "valid") status = { text: "Valid", tone: "text-success" };
  else if (v.status === "invalid") status = { text: "Invalid JSON", tone: "text-error" };
  else status = { text: state.input.trim() ? "Checking…" : "Waiting for input", tone: "text-text-faint" };

  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
      <span className={status.tone}>● {status.text}</span>
      <span>{formatBytes(bytes)}</span>
      {shape && <span>{shape.keys} keys</span>}
      {shape && !isMobile && <span>depth {shape.depth}</span>}
      <span className="grow" />
      {!isMobile && <span>UTF-8</span>}
      <span className="text-success-text">Local-only</span>
    </div>
  );
}
