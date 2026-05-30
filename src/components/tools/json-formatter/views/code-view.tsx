"use client";

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { IndentStyle } from "@/components/tools/json-formatter/json-formatter.types";
import {
  highlight,
  HIGHLIGHT_SIZE_THRESHOLD,
  highlightWithSearch,
  type Lang,
  lineCount,
} from "@/lib/highlight";
import { GutterLines } from "./code-view-gutter";

export interface CodeViewProps {
  value: string;
  onChange?: (v: string) => void;
  /** Pre-computed HTML — set by the output panel when it manages search highlighting. */
  highlighted?: string;
  indent: IndentStyle;
  onCursorChange?: (pos: { ln: number; col: number }) => void;
  errorLine?: number;
  /**
   * Imperative "jump to error": bump `nonce` to move the caret to
   * `line`/`col`, focus the editor, and scroll the line into view.
   */
  jumpToError?: { line: number; col: number; nonce: number };
  /** Called with the auto-formatted value when valid JSON is pasted. */
  onPasteFormatted?: (formatted: string) => void;
  /** Language for syntax highlighting. Defaults to JSON. */
  lang?: Lang;
  /** Optional search term applied to the locally-computed highlight (editable mode). */
  search?: string;
  /** Textarea placeholder. Defaults to a JSON-flavoured hint for back-compat. */
  placeholder?: string;
  /**
   * Override the max-source-size threshold past which the highlighter
   * bails to plain escaped text. Default is `HIGHLIGHT_SIZE_THRESHOLD`
   * (100 KB) — tuned for live-edit JSON. Read-mostly tools (e.g. the
   * code-formatter output pane) can safely pass a much larger value.
   */
  maxHighlightSize?: number;
  /**
   * Soft-wrap long lines instead of horizontal scrolling. With wrap on,
   * source lines can span multiple visual rows, so the line-number gutter
   * is hidden — it would otherwise drift out of sync with the wrapped
   * content. Defaults off to preserve the json-formatter behaviour where
   * navigating to a parse-error line matters more than line length.
   */
  wrap?: boolean;
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
  jumpToError,
  onPasteFormatted,
  lang = "json",
  search,
  placeholder = "Paste JSON here…",
  maxHighlightSize = HIGHLIGHT_SIZE_THRESHOLD,
  wrap = false,
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

  // O(n) over the whole document — memoize so a resize / cursor / validation
  // re-render doesn't rescan a multi-MB string every frame.
  const numLines = useMemo(() => lineCount(localValue), [localValue]);
  const indentSize = indent === "tab" ? 4 : Number(indent);

  // Above the highlight threshold there's no syntax colouring anyway (the
  // highlighter bails to plain escaped text). Rebuilding a multi-MB overlay
  // on every keystroke is what makes large input laggy — so drop the overlay
  // entirely and let the textarea show its own text. No overlay ⇒ no
  // per-keystroke escape/innerHTML/relayout, and no alignment risk.
  const plainMode = !isReadOnly && localValue.length > maxHighlightSize;

  // ── Highlight ─────────────────────────────────────────────────────────────
  // For the read-only branch the parent panel already computes and passes
  // the highlighted HTML in (it owns search). For the editable branch we
  // compute here, synchronously off `localValue`. See the latency note
  // above for why this is NOT wrapped in `useDeferredValue`.
  const editableHighlight = useMemo(() => {
    if (isReadOnly || plainMode) return "";
    if (search && search.trim().length > 0) {
      return highlightWithSearch(localValue, lang, search, maxHighlightSize);
    }
    return highlight(localValue, lang, maxHighlightSize);
  }, [localValue, lang, search, isReadOnly, plainMode, maxHighlightSize]);

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
      // The JSON-format-on-paste behaviour below is opt-in via the
      // `onPasteFormatted` callback. Consumers (e.g. code-formatter)
      // that don't want it just omit the callback and the textarea
      // handles the paste natively.
      if (!onPasteFormatted) return;

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

  // Jump to the parse-error position when the banner is clicked. Caret +
  // scroll are imperative DOM (no state), so this stays out of the render
  // path and never competes with typing.
  //
  // Guard: the effect dep is the nonce, which transitions undefined → 0
  // (or any number) the FIRST time validation lands invalid. That
  // transition would auto-fire the jump and yank the caret away from
  // where the user was typing — even though they never clicked anything.
  // `lastActedNonce` tracks the last nonce we've already responded to so
  // we only re-fire on a genuine new click.
  const jumpNonce = jumpToError?.nonce;
  const lastActedNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (jumpToError === undefined || isReadOnly) return;
    if (lastActedNonce.current === jumpNonce) return;
    // First-time observation of any nonce (including the initial 0 when
    // validation just landed invalid) is treated as "already acted on" —
    // we never auto-jump, only respond to an explicit subsequent change.
    if (lastActedNonce.current === undefined) {
      lastActedNonce.current = jumpNonce;
      return;
    }
    lastActedNonce.current = jumpNonce;
    const ta = textareaRef.current;
    if (!ta) return;
    const text = ta.value;
    let idx = 0;
    for (let ln = 1; ln < jumpToError.line; ln++) {
      const nl = text.indexOf("\n", idx);
      if (nl === -1) {
        idx = text.length;
        break;
      }
      idx = nl + 1;
    }
    const offset = Math.min(text.length, idx + Math.max(0, jumpToError.col - 1));
    ta.focus();
    ta.setSelectionRange(offset, offset);
    const lh =
      Number.parseFloat(getComputedStyle(ta).lineHeight) || 22;
    ta.scrollTop = Math.max(0, (jumpToError.line - 3) * lh);
    syncScroll();
    // `jumpNonce` is the intentional trigger; line/col are read fresh above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpNonce, isReadOnly, syncScroll]);

  // ── Render ────────────────────────────────────────────────────────────────
  // With wrap on, both panes use whitespace-pre-wrap + break-words so
  // the textarea's caret position lines up with the highlighted overlay
  // even when long lines fold. Horizontal scrolling is suppressed; the
  // gutter is hidden because its source-line numbers no longer correlate
  // 1:1 with visual rows.
  const wrapCls = wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre";
  const preReadOnlyOverflow = wrap ? "overflow-y-auto overflow-x-hidden" : "overflow-auto";
  const overlayOverflow = wrap ? "overflow-y-auto overflow-x-hidden" : "overflow-auto";

  return (
    <div className="relative flex h-full overflow-hidden">
      {!wrap && (
        <div
          ref={gutterRef}
          aria-hidden
          className="no-scrollbar select-none overflow-hidden whitespace-pre bg-surface-soft/20 border-r border-border-subtle py-3 px-2 text-right font-mono text-base leading-code tracking-tight text-text-faint min-w-line-num shrink-0"
        >
          <GutterLines numLines={numLines} errorLine={errorLine} />
        </div>
      )}

      {isReadOnly ? (
        <pre
          ref={preRef}
          onScroll={syncScroll}
          className={`flex-1 ${preReadOnlyOverflow} px-3 py-3 font-mono text-base leading-code tracking-tight text-text m-0 ${wrapCls}`}
        >
          {value ? (
            <code dangerouslySetInnerHTML={{ __html: highlighted ?? "" }} />
          ) : (
            <span className="text-text-faint">Output will appear here.</span>
          )}
        </pre>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          {!plainMode && (
            <HighlightOverlay
              preRef={preRef}
              html={editableHighlight}
              wrapCls={wrapCls}
              overflowCls={overlayOverflow}
            />
          )}
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
            placeholder={placeholder}
            className={`${plainMode ? "text-text" : "code-overlay-textarea"} absolute inset-0 m-0 px-3 py-3 font-mono text-base leading-code tracking-tight bg-transparent border-0 resize-none outline-none ${overlayOverflow} ${wrapCls}`}
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
  wrapCls = "whitespace-pre",
  overflowCls = "overflow-auto",
}: {
  preRef: React.RefObject<HTMLPreElement | null>;
  html: string;
  wrapCls?: string;
  overflowCls?: string;
}) {
  return (
    <pre
      ref={preRef}
      aria-hidden
      className={`absolute inset-0 m-0 px-3 py-3 ${overflowCls} font-mono text-base leading-code tracking-tight text-text pointer-events-none ${wrapCls}`}
    >
      <code dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />
    </pre>
  );
});
