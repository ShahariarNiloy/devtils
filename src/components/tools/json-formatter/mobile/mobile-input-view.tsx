"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { CodeView } from "../views/code-view";
import type { JsonFormatterState } from "../use-json-formatter";

interface MobileInputViewProps {
  state: JsonFormatterState;
  onLoadFile: (file: File) => void;
}

export function MobileInputView({ state, onLoadFile }: MobileInputViewProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const v = state.validation;
  const errorLine = v.status === "invalid" ? v.line : undefined;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden bg-surface",
        isDragOver && "ring-2 ring-inset ring-brand/50",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onLoadFile(file);
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,.csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onLoadFile(file);
            e.target.value = "";
          }
        }}
      />

      {/* Invalid banner — compact on mobile, with a Repair CTA so auto-fix
          is discoverable here too (not just behind the toolbar). */}
      {v.status === "invalid" && (
        <div className="flex shrink-0 items-center gap-2 border-b border-danger/30 bg-danger/10 px-3 py-1.5 text-[12px] text-danger">
          <AlertCircle size={12} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate leading-snug">
            Line {v.line}, col {v.col}: {v.message}
          </span>
          {!state.jsConversion && (
            <button
              type="button"
              onClick={state.repair}
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-danger px-2 text-[11px] font-medium text-bg"
              title="Auto-fix this JSON"
            >
              <Wand2 size={11} aria-hidden />
              Repair
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <CodeView
          value={state.input}
          onChange={state.setInput}
          indent={state.indent}
          onCursorChange={state.setInputCursor}
          errorLine={errorLine}
          onPasteFormatted={state.formatFrom}
        />
      </div>
    </div>
  );
}
