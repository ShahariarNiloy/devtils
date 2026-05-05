"use client";

import type { IndentStyle } from "@/components/tools/json-formatter/json-formatter.types";
import { lineCount } from "@/components/tools/json-formatter/json-highlighter";
import { cn } from "@/lib/cn";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export interface CodeViewProps {
  value: string;
  onChange?: (v: string) => void;
  highlighted?: string;
  indent: IndentStyle;
  onCursorChange?: (pos: { ln: number; col: number }) => void;
  errorLine?: number;
  /** Called with the auto-formatted value when valid JSON is pasted. */
  onPasteFormatted?: (formatted: string) => void;
}

// Memoised so the gutter only re-renders when line count or error line changes,
// not on every character typed within a line.
const GutterLines = memo(
  ({ numLines, errorLine }: { numLines: number; errorLine?: number }) => (
    <>
      {Array.from({ length: numLines }, (_, i) => {
        const n = i + 1;
        const isError = errorLine === n;
        return (
          <div
            key={n}
            className={cn(
              "px-1 text-right",
              isError && "bg-danger/20 text-danger rounded-sm"
            )}
          >
            {n}
          </div>
        );
      })}
    </>
  )
);
GutterLines.displayName = "GutterLines";

export function CodeView({
  value,
  onChange,
  highlighted,
  indent,
  onCursorChange,
  errorLine,
  onPasteFormatted,
}: CodeViewProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement & HTMLPreElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isReadOnly = onChange === undefined;

  // Local state decouples the textarea from parent renders.
  // Keystrokes only re-render CodeView itself; the parent is updated debounced.
  const [localValue, setLocalValue] = useState(value);
  // Track the last prop value seen so we can detect programmatic parent updates
  // (format, minify, load sample, clear, repair…) and sync them in immediately.
  // This is the React-canonical "getDerivedStateFromProps" pattern using useState.
  const [prevPropValue, setPrevPropValue] = useState(value);
  if (value !== prevPropValue) {
    setPrevPropValue(value);
    setLocalValue(value);
  }

  // Clean up debounce timer on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const numLines = lineCount(localValue);
  const indentSize = indent === "tab" ? 4 : Number(indent);

  const syncScroll = useCallback(() => {
    if (gutterRef.current && contentRef.current) {
      gutterRef.current.scrollTop = contentRef.current.scrollTop;
    }
  }, []);

  const handleChange = useCallback(
    (v: string) => {
      setLocalValue(v);
      // Propagate to parent debounced — avoids triggering expensive parent
      // re-renders (validation, JSON.parse, stats) on every single keystroke.
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange?.(v);
      }, 120);
    },
    [onChange]
  );

  // On paste: read from clipboard synchronously (no rAF race conditions),
  // auto-format if valid JSON, propagate immediately (bypass 120 ms debounce),
  // and notify parent so the output panel can update too.
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const isEmpty = !ta.value.trim();
      const isAllSelected =
        ta.selectionStart === 0 && ta.selectionEnd === ta.value.length;

      // Only intercept when replacing all content (empty box or Ctrl+A paste).
      if (!isEmpty && !isAllSelected) return;

      const clipped = e.clipboardData.getData("text/plain");
      e.preventDefault();

      const spaces = indent === "tab" ? "\t" : Number(indent);
      let out = clipped;
      let isJson = false;
      try {
        out = JSON.stringify(JSON.parse(clipped.trim()), null, spaces);
        isJson = true;
      } catch {
        // Not valid JSON — keep raw
      }

      setLocalValue(out);
      clearTimeout(debounceRef.current);
      onChange?.(out);
      if (isJson) onPasteFormatted?.(out);
    },
    [onChange, indent, onPasteFormatted]
  );

  const trackCursor = useCallback(
    (el: HTMLTextAreaElement) => {
      if (!onCursorChange) return;
      const pos = el.selectionStart;
      const before = el.value.slice(0, pos);
      const lines = before.split("\n");
      const ln = lines.length;
      const col = (lines[lines.length - 1]?.length ?? 0) + 1;
      onCursorChange({ ln, col });
    },
    [onCursorChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const spaces = indent === "tab" ? "\t" : " ".repeat(indentSize);
        const next = ta.value.slice(0, start) + spaces + ta.value.slice(end);
        handleChange(next);
        requestAnimationFrame(() => {
          ta.selectionStart = start + spaces.length;
          ta.selectionEnd = start + spaces.length;
        });
      }
    },
    [indent, indentSize, handleChange]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      trackCursor(e.currentTarget);
    },
    [trackCursor]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      trackCursor(e.currentTarget);
    },
    [trackCursor]
  );

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Line number gutter */}
      <div
        ref={gutterRef}
        aria-hidden
        className="no-scrollbar select-none overflow-hidden bg-surface-soft/20 border-r border-border-subtle py-3 px-2 text-right font-mono text-sm leading-code text-text-faint min-w-line-num shrink-0"
      >
        <GutterLines numLines={numLines} errorLine={errorLine} />
      </div>

      {/* Content area */}
      {isReadOnly ? (
        <pre
          ref={contentRef as React.RefObject<HTMLPreElement>}
          onScroll={syncScroll}
          className="flex-1 overflow-auto px-3 py-3 font-mono text-sm leading-code text-text m-0"
        >
          {value ? (
            <code dangerouslySetInnerHTML={{ __html: highlighted ?? "" }} />
          ) : (
            <span className="text-text-faint">Output will appear here.</span>
          )}
        </pre>
      ) : (
        <textarea
          ref={contentRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onPaste={handlePaste}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          spellCheck={false}
          placeholder="Paste JSON here…"
          className="flex-1 resize-none bg-transparent px-3 py-3 font-mono text-sm leading-code text-text placeholder:text-text-faint outline-none border-0"
        />
      )}
    </div>
  );
}
