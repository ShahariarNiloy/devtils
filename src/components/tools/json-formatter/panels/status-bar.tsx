"use client";

import { AlertCircle, CheckCircle2, CircleDashed, Lock } from "lucide-react";
import { useMemo } from "react";
import type { JsonFormatterState } from "../use-json-formatter";
import { byteLength, formatBytes } from "../json-formatter.lib";

interface StatusBarProps {
  state: JsonFormatterState;
}

export function StatusBar({ state }: StatusBarProps) {
  const v = state.validation;
  // Defer the byte count to avoid recomputing on every keystroke.
  const bytes = useMemo(() => byteLength(state.input), [state.input]);

  let badge: React.ReactNode;
  if (v.status === "valid") {
    badge = (
      <span className="inline-flex items-center gap-1.5 text-success">
        <CheckCircle2 size={12} />
        Valid JSON
      </span>
    );
  } else if (v.status === "invalid") {
    badge = (
      <span className="inline-flex items-center gap-1.5 text-danger">
        <AlertCircle size={12} />
        Ln {v.line}, col {v.col}
      </span>
    );
  } else {
    badge = (
      <span className="inline-flex items-center gap-1.5 text-text-faint">
        <CircleDashed size={12} />
        Idle
      </span>
    );
  }

  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-t border-border-subtle bg-surface px-3 text-sm font-mono text-text-faint">
      <div className="flex items-center gap-4">
        {badge}
        <Separator />
        <span>
          Ln {state.inputCursor.ln}, Col {state.inputCursor.col}
        </span>
        <Separator />
        <span>{formatBytes(bytes)}</span>
        {state.fileName && (
          <>
            <Separator />
            <span className="truncate max-w-[280px]" title={state.fileName}>
              {state.fileName}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5">
          <Lock size={11} />
          Local-only
        </span>
        <Separator />
        <span>UTF-8</span>
        <Separator />
        <span>JSON</span>
      </div>
    </div>
  );
}

function Separator() {
  return <span className="text-border-strong/40" aria-hidden>·</span>;
}
