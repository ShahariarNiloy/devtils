"use client";

import React, { useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
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

      {/* Invalid banner — compact on mobile */}
      {v.status === "invalid" && (
        <div className="flex shrink-0 items-start gap-2 border-b border-danger/30 bg-danger/10 px-3 py-1.5 text-[12px] text-danger">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span className="leading-snug">
            Line {v.line}, col {v.col}: {v.message}
          </span>
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
