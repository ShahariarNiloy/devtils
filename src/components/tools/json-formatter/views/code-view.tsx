"use client";

import {
  memo,
  startTransition,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { IndentStyle } from "@/components/tools/json-formatter/json-formatter.types";
import {
  highlight,
  highlightWithSearch,
  type Lang,
  lineCount,
} from "@/components/tools/json-formatter/highlight";
import { GutterLines } from "./code-view-gutter";

export interface CodeViewProps {
  value: string;
  onChange?: (v: string) => void;
  /** Pre-computed HTML — set by the output panel when it manages search highlighting. */
  highlighted?: string;
  indent: IndentStyle;
  onCursorChange?: (pos: { ln: number; col: number }) => void;
  errorLine?: number;
  /** Called with the auto-formatted value when valid JSON is pasted. */
  onPasteFormatted?: (formatted: string) => void;
  /** Language for syntax highlighting. Defaults to JSON. */
  lang?: Lang;
  /** Optional search term applied to the locally-computed highlight (editable mode). */
  search?: string;
}

/**
 * Overlay-style editor: a controlled `<textarea>` floats over a `<pre>`
 * carrying the syntax-highlighted markup. The textarea is the source of
 * input + cursor; the pre is decoration only.
 *
 * Latency model — the goal is that typing never blocks on React:
 *   1. Local state (`localValue`) updates on every keystroke so the
 *      textarea is always frame-perfect. The value prop matches the DOM by
 *      the time React reconciles, so the controlled-input write is a no-op
 *      and the caret is never reset.
 *   2. The parent `onChange` is forwarded inside `startTransition` —
 *      parsing, validation, status-bar and tree-view re-renders are all
 *      non-urgent and never compete with the typing keystroke.
 *   3. The cursor report (`onCursorChange`) is ALSO wrapped in
 *      `startTransition`. The status bar happily lags by a render.
 *   4. The highlight runs synchronously off `localValue` — no
 *      `useDeferredValue`. The overlay text is what the user actually sees
 *      (the textarea's own text is transparent), so deferring would leave a
 *      one-frame gap where the just-typed character is invisible. Inputs
 *      above `HIGHLIGHT_SIZE_THRESHOLD` already short-circuit to plain
 *      escaped text inside `highlight`, so the tokenizer never blows the
 *      frame budget.
 *   5. The overlay `<pre>` is split into a memoized subcomponent so that
 *      unrelated parent re-renders (cursor / validation) skip re-parsing
 *      its `dangerouslySetInnerHTML`.
 */
export function CodeView({
  value,
  onChange,
  highlighted,
  indent,
  onCursorChange,
  errorLine,
  onPasteFormatted,
  lang = "json",
  search,
}: CodeViewProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isReadOnly = onChange === undefined;

  // Local state decouples the textarea from parent renders. Parent updates
  // are wrapped in startTransition so they never block typing. The
  // render-time sync is React's "derived state from props" idiom — if the
  // parent's value diverges from our local copy (e.g. external setInput,
  // sample load, repair-apply), pick up the new value before render
  // commits. By the time controlled-input reconciliation runs, prop value
  // matches DOM value, so the cursor stays put.
  const [localValue, setLocalValue] = useState(value);
  const [prevPropValue, setPrevPropValue] = useState(value);
  if (value !== prevPropValue) {
    setPrevPropValue(value);
    setLocalValue(value);
  }

  const numLines = lineCount(localValue);
  const indentSize = indent === "tab" ? 4 : Number(indent);

  // ── Highlight ─────────────────────────────────────────────────────────────
  // For the read-only branch the parent panel already computes and passes
  // the highlighted HTML in (it owns search). For the editable branch we
  // compute here, synchronously off `localValue`. See the latency note
  // above for why this is NOT wrapped in `useDeferredValue`.
  const editableHighlight = useMemo(() => {
    if (isReadOnly) return "";
    if (search && search.trim().length > 0) {
      return highlightWithSearch(localValue, lang, search);
    }
    return highlight(localValue, lang);
  }, [localValue, lang, search, isReadOnly]);

  // ── Scroll sync ───────────────────────────────────────────────────────────
  const syncScroll = useCallback(() => {
    const src = textareaRef.current ?? preRef.current;
    if (!src) return;
    const top = src.scrollTop;
    const left = src.scrollLeft;
    if (gutterRef.current) gutterRef.current.scrollTop = top;
    if (preRef.current && src !== preRef.current) {
      preRef.current.scrollTop = top;
      preRef.current.scrollLeft = left;
    }
    if (textareaRef.current && src !== textareaRef.current) {
      textareaRef.current.scrollTop = top;
      textareaRef.current.scrollLeft = left;
    }
  }, []);

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const propagate = useCallback(
    (v: string) => {
      if (!onChange) return;
      // Heavy work downstream — schedule as a transition so the textarea
      // render commits in the same frame as the keystroke.
      startTransition(() => onChange(v));
    },
    [onChange],
  );

  const handleChange = useCallback(
    (v: string) => {
      setLocalValue(v);
      propagate(v);
    },
    [propagate],
  );

  // On paste: auto-format if the clipboard is valid JSON and we're replacing
  // all content. JSON.parse + JSON.stringify happen on the main thread, but
  // pastes are infrequent so the cost is one-shot.
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const isEmpty = !ta.value.trim();
      const isAllSelected =
        ta.selectionStart === 0 && ta.selectionEnd === ta.value.length;
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
        /* not JSON — leave raw */
      }

      setLocalValue(out);
      startTransition(() => {
        onChange?.(out);
        if (isJson) onPasteFormatted?.(out);
      });
    },
    [onChange, indent, onPasteFormatted],
  );

  const trackCursor = useCallback(
    (el: HTMLTextAreaElement) => {
      if (!onCursorChange) return;
      const pos = el.selectionStart;
      const val = el.value;
      // Inline newline count — faster than slice + split for large values.
      let ln = 1;
      let lastNewline = -1;
      for (let i = 0; i < pos; i++) {
        if (val.charCodeAt(i) === 10) {
          ln++;
          lastNewline = i;
        }
      }
      const col = pos - lastNewline;
      // Status-bar update — happy to lag behind typing by a render.
      startTransition(() => onCursorChange({ ln, col }));
    },
    [onCursorChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      // Tab: indent
      if (e.key === "Tab") {
        e.preventDefault();
        const spaces = indent === "tab" ? "\t" : " ".repeat(indentSize);
        const next = ta.value.slice(0, start) + spaces + ta.value.slice(end);
        handleChange(next);
        requestAnimationFrame(() => {
          ta.selectionStart = start + spaces.length;
          ta.selectionEnd = start + spaces.length;
        });
        return;
      }

      const PAIR_OPEN: Record<string, string> = {
        "{": "}",
        "[": "]",
        "(": ")",
        '"': '"',
      };
      const PAIR_CLOSE_LOOKUP: Record<string, string> = {
        "}": "{",
        "]": "[",
        ")": "(",
      };
      const isCollapsed = start === end;
      const nextChar = ta.value[start];
      const prevChar = start > 0 ? ta.value[start - 1] : "";

      if (isCollapsed && PAIR_CLOSE_LOOKUP[e.key] && nextChar === e.key) {
        e.preventDefault();
        const pos = start + 1;
        requestAnimationFrame(() => {
          ta.selectionStart = pos;
          ta.selectionEnd = pos;
        });
        return;
      }
      if (isCollapsed && e.key === '"' && nextChar === '"') {
        e.preventDefault();
        const pos = start + 1;
        requestAnimationFrame(() => {
          ta.selectionStart = pos;
          ta.selectionEnd = pos;
        });
        return;
      }

      const closer = PAIR_OPEN[e.key];
      if (closer) {
        const skipQuote = e.key === '"' && /[A-Za-z0-9_]/.test(prevChar);
        if (!skipQuote) {
          e.preventDefault();
          const selected = ta.value.slice(start, end);
          const insertion = e.key + selected + closer;
          const next = ta.value.slice(0, start) + insertion + ta.value.slice(end);
          handleChange(next);
          requestAnimationFrame(() => {
            const caret = start + 1 + selected.length;
            ta.selectionStart = caret;
            ta.selectionEnd = caret;
          });
          return;
        }
      }

      if (e.key === "Backspace" && isCollapsed && start > 0) {
        const opener = ta.value[start - 1];
        if (PAIR_OPEN[opener] && PAIR_OPEN[opener] === nextChar) {
          e.preventDefault();
          const next = ta.value.slice(0, start - 1) + ta.value.slice(start + 1);
          handleChange(next);
          requestAnimationFrame(() => {
            const caret = start - 1;
            ta.selectionStart = caret;
            ta.selectionEnd = caret;
          });
        }
      }
    },
    [indent, indentSize, handleChange],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => trackCursor(e.currentTarget),
    [trackCursor],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => trackCursor(e.currentTarget),
    [trackCursor],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex h-full overflow-hidden">
      <div
        ref={gutterRef}
        aria-hidden
        className="no-scrollbar select-none overflow-hidden whitespace-pre bg-surface-soft/20 border-r border-border-subtle py-3 px-2 text-right font-mono text-base leading-code tracking-tight text-text-faint min-w-line-num shrink-0"
      >
        <GutterLines numLines={numLines} errorLine={errorLine} />
      </div>

      {isReadOnly ? (
        <pre
          ref={preRef}
          onScroll={syncScroll}
          className="flex-1 overflow-auto px-3 py-3 font-mono text-base leading-code tracking-tight text-text m-0"
        >
          {value ? (
            <code dangerouslySetInnerHTML={{ __html: highlighted ?? "" }} />
          ) : (
            <span className="text-text-faint">Output will appear here.</span>
          )}
        </pre>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          <HighlightOverlay preRef={preRef} html={editableHighlight} />
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onPaste={handlePaste}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onClick={handleClick}
            spellCheck={false}
            placeholder="Paste JSON here…"
            className="code-overlay-textarea absolute inset-0 m-0 px-3 py-3 font-mono text-base leading-code tracking-tight bg-transparent border-0 resize-none outline-none overflow-auto whitespace-pre"
          />
        </div>
      )}
    </div>
  );
}

/**
 * The highlight overlay is split out so React skips re-rendering its
 * `dangerouslySetInnerHTML` when CodeView re-renders for unrelated reasons
 * (e.g. a parent cursor / validation update). It only re-renders when the
 * computed HTML string changes.
 */
const HighlightOverlay = memo(function HighlightOverlay({
  preRef,
  html,
}: {
  preRef: React.RefObject<HTMLPreElement | null>;
  html: string;
}) {
  return (
    <pre
      ref={preRef}
      aria-hidden
      className="absolute inset-0 m-0 px-3 py-3 overflow-auto font-mono text-base leading-code tracking-tight text-text pointer-events-none whitespace-pre"
    >
      <code dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />
    </pre>
  );
});
