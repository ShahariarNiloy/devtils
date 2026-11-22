"use client";

import { startTransition, useEffect, useImperativeHandle, useRef, useState } from "react";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { HighlightStyle, indentUnit as indentUnitFacet, syntaxHighlighting } from "@codemirror/language";
import { Annotation, Compartment, EditorSelection, EditorState, RangeSetBuilder, StateEffect, StateField, type Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  gutterLineClass,
  keymap,
  lineNumbers as lineNumbersExt,
  placeholder as placeholderExt,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { cn } from "@/lib/cn";
import { LANGUAGES, languageExtension } from "./languages";
import { setPendingEdit } from "./pending";
import { DEFAULT_HOST_CLASS, DEFAULT_LINE_HEIGHT, DEFAULT_PADDING, type CodeEditorProps, type CodeLanguage } from "./types";

/**
 * Shared CodeMirror 6 editor for multi-line code / data inputs and large
 * read-only outputs. Load it through `LazyCodeEditor` (`./code-editor-lazy`)
 * so CodeMirror never lands in a page's first load.
 *
 * Why CodeMirror instead of a <textarea>: a native textarea re-lays-out the
 * whole document on every keystroke — 100–200 ms per key at ~2 MB and up to
 * ~900 ms at ~9 MB, before any app code runs. CodeMirror renders only the
 * lines in view and highlights incrementally, so typing cost is independent
 * of document size.
 *
 * Latency model:
 *   - Keystrokes are handled entirely inside CodeMirror (no React render).
 *   - The document is pushed to React (`onChange`) inside a transition. For
 *     large documents it's also debounced, so a burst of typing costs one
 *     O(n) `doc.toString()` + parse instead of one per key.
 *   - External value changes (sample, Format, Repair, Swap…) are applied as
 *     a single CodeMirror transaction; our own echoes are recognised and
 *     skipped.
 */

/** Marks transactions that mirror an external `value` change (not user edits). */
const externalSync = Annotation.define<boolean>();

/**
 * Above this size, syntax colouring is switched off (like VS Code does for
 * huge files): the incremental parser would otherwise spend seconds of
 * background time on a multi-MB document and delay keystroke paints. The
 * editor stays virtualized either way.
 */
const HIGHLIGHT_MAX = 1_000_000;

/**
 * Above this size, edits reach React debounced instead of on every key. The
 * delay grows with the document (120 ms → 600 ms at ~24 MB) so a burst of
 * typing in a huge file costs one re-parse, not one per pause.
 */
const DEBOUNCE_ABOVE = 200_000;
const debounceMs = (len: number) => Math.min(600, 120 + Math.round(len / 50_000));

// ── Theme ────────────────────────────────────────────────────────────────────

const highlightStyle = HighlightStyle.define([
  { tag: t.propertyName, color: "var(--tok-key)" },
  { tag: t.string, color: "var(--tok-string)" },
  { tag: t.number, color: "var(--tok-number)" },
  { tag: t.bool, color: "var(--tok-bool)" },
  { tag: t.null, color: "var(--tok-null)" },
  { tag: [t.separator, t.squareBracket, t.brace, t.punctuation], color: "var(--tok-punct)" },
  { tag: t.invalid, color: "var(--color-syntax-error)" },
  // Non-JSON grammars (loaded on demand) map onto the same token palette.
  { tag: t.keyword, color: "var(--tok-kw)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--tok-comment)" },
  { tag: t.tagName, color: "var(--tok-tag)" },
  { tag: t.attributeName, color: "var(--tok-attr)" },
  { tag: [t.typeName, t.className], color: "var(--tok-type)" },
  { tag: t.operator, color: "var(--tok-op)" },
  { tag: [t.heading, t.strong], fontWeight: "600" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "var(--tok-key)", textDecoration: "underline" },
]);

const baseTheme = EditorView.theme(
  {
    "&": { height: "100%", backgroundColor: "transparent", color: "var(--color-syntax-plain)" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: "var(--font-mono)", overflow: "auto" },
    ".cm-line": { padding: "0" },
    ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--color-text-ghost)" },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 8px", minWidth: "32px" },
    ".cm-gutterElement.cm-err-line": { color: "var(--color-error)", fontWeight: "600" },
    ".cm-err-line-bg": { backgroundColor: "color-mix(in srgb, var(--color-error) 14%, transparent)" },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-text)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(246, 242, 234, 0.16) !important",
    },
    ".cm-placeholder": { color: "var(--color-text-faint)" },
    ".cm-search-hit": { backgroundColor: "rgba(224, 160, 114, 0.32)", borderRadius: "2px" },
  },
  { dark: true },
);

/** Per-instance metrics (fixed for the editor's lifetime). */
const metricsTheme = (lineHeight: number, padding: string) =>
  EditorView.theme({
    ".cm-scroller": { lineHeight: String(lineHeight) },
    ".cm-content": { padding, caretColor: "var(--color-text)" },
  });

// ── Error lines: red gutter numbers, or a line tint without a gutter ─────────

const errMarker = new (class extends GutterMarker {
  elementClass = "cm-err-line";
})();
const errLineDeco = Decoration.line({ class: "cm-err-line-bg" });
const setErrorLines = StateEffect.define<readonly number[]>();

/** Valid, sorted, de-duplicated 1-based error lines for this document. */
function errorLineStarts(state: EditorState, lines: readonly number[]): number[] {
  return [...new Set(lines)]
    .filter((n) => n >= 1 && n <= state.doc.lines)
    .sort((a, c) => a - c)
    .map((n) => state.doc.line(n).from);
}

const errorLinesField = StateField.define<readonly number[]>({
  create: () => [],
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setErrorLines)) return e.value;
    return v;
  },
});
const errorGutterMarks = gutterLineClass.compute([errorLinesField, "doc"], (state) => {
  const b = new RangeSetBuilder<GutterMarker>();
  for (const from of errorLineStarts(state, state.field(errorLinesField))) b.add(from, from, errMarker);
  return b.finish();
});
const errorLineTint = EditorView.decorations.compute([errorLinesField, "doc"], (state) => {
  const b = new RangeSetBuilder<Decoration>();
  for (const from of errorLineStarts(state, state.field(errorLinesField))) b.add(from, from, errLineDeco);
  return b.finish();
});

// ── Search highlight (visible ranges only — O(viewport), not O(document)) ────

const setSearch = StateEffect.define<string>();
const searchField = StateField.define<string>({
  create: () => "",
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setSearch)) return e.value;
    return v;
  },
});
const hit = Decoration.mark({ class: "cm-search-hit" });
function searchDecos(view: EditorView): DecorationSet {
  const term = view.state.field(searchField).toLowerCase();
  if (!term) return Decoration.none;
  const b = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to).toLowerCase();
    let i = text.indexOf(term);
    while (i !== -1) {
      b.add(from + i, from + i + term.length, hit);
      i = text.indexOf(term, i + term.length);
    }
  }
  return b.finish();
}
const searchHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = searchDecos(view);
    }
    update(u: ViewUpdate) {
      const changed = u.startState.field(searchField) !== u.state.field(searchField);
      if (changed || u.docChanged || u.viewportChanged) this.decorations = searchDecos(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Tab inserts the indent unit at every cursor (a data editor never needs focus-out on Tab). */
const insertIndent = (view: EditorView) => {
  const unit = view.state.facet(indentUnitFacet);
  view.dispatch(view.state.replaceSelection(unit), { scrollIntoView: true, userEvent: "input" });
  return true;
};

function cursorPos(state: EditorState) {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  return { ln: line.number, col: head - line.from + 1 };
}

function jumpView(view: EditorView, line: number, col: number) {
  const ln = Math.min(Math.max(1, line), view.state.doc.lines);
  const l = view.state.doc.line(ln);
  const pos = Math.min(l.to, l.from + Math.max(0, col - 1));
  view.dispatch({ selection: EditorSelection.cursor(pos), effects: EditorView.scrollIntoView(pos, { y: "center" }) });
  view.focus();
}

export default function CodeEditor({
  value,
  onChange,
  language = "json",
  indentUnit = "  ",
  onCursorChange,
  onPasteFormatted,
  formatPaste,
  onDropFile,
  placeholder = "",
  errorLines,
  jumpTo,
  onJumped,
  search,
  wrap = false,
  lineNumbers = true,
  lineHeight = DEFAULT_LINE_HEIGHT,
  padding = DEFAULT_PADDING,
  ariaLabel,
  emptyText = "",
  className = DEFAULT_HOST_CLASS,
  editorRef,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnly = onChange === undefined;
  // The last document we pushed to React, so its echo back as `value` is a no-op.
  const lastEmitted = useRef(value);
  /**
   * Every document pushed to React that hasn't come back as `value` yet.
   * `onChange` runs in a transition, and React may commit those out of order
   * (an older "ab" after "abc" was already emitted during fast typing). Any
   * value found here is our own echo — never an external change — so it must
   * not reset the editor (that dropped and reordered keystrokes).
   */
  const inFlight = useRef<string[]>([]);
  const [emit] = useState(() => (text: string) => {
    lastEmitted.current = text;
    const q = inFlight.current;
    q.push(text);
    if (q.length > 64) q.shift();
  });
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last `jumpTo.nonce` applied to the current view (reset when a view is created).
  const lastNonce = useRef<number | undefined>(undefined);

  // Latest callbacks without rebuilding the editor.
  const cb = useRef({ onChange, onCursorChange, onPasteFormatted, formatPaste, onDropFile, onJumped });
  useEffect(() => {
    cb.current = { onChange, onCursorChange, onPasteFormatted, formatPaste, onDropFile, onJumped };
  });

  /**
   * `flushNow` delivers a pending debounced edit synchronously (not in a
   * transition, so state the caller sets next is applied after it);
   * `clearPending` drops it. Stable identities — `flushNow` is the key in
   * the pending-edit registry.
   */
  const [{ flushNow, clearPending }] = useState(() => {
    const clear = () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = null;
      setPendingEdit(deliver, false);
    };
    const deliver = () => {
      const view = viewRef.current;
      if (!flushTimer.current || !view) return;
      clear();
      const text = view.state.doc.toString();
      emit(text);
      cb.current.onChange?.(text);
    };
    return { flushNow: deliver, clearPending: clear };
  });

  useImperativeHandle(
    editorRef,
    () => ({
      flush: () => {
        flushNow();
        return viewRef.current?.state.doc.toString() ?? lastEmitted.current;
      },
    }),
    [flushNow],
  );


  const wrapC = useRef(new Compartment());
  const indentC = useRef(new Compartment());
  const placeholderC = useRef(new Compartment());
  const langC = useRef(new Compartment());
  const bracketsC = useRef(new Compartment());
  const attrsC = useRef(new Compartment());
  const contentAttrs = (label: string | undefined) =>
    EditorView.contentAttributes.of({
      spellcheck: "false",
      autocorrect: "off",
      autocapitalize: "off",
      "aria-label": label ?? (readOnly ? "Output" : "Input"),
    });
  // What the language compartment should hold: the language, and whether the
  // document is small enough to colour.
  const langState = useRef<{ lang: CodeLanguage; highlighted: boolean }>({ lang: language, highlighted: value.length <= HIGHLIGHT_MAX });

  /** Language compartment content now (async languages arrive via a later reconfigure). */
  const langContent = (view: EditorView | null): Extension => {
    const { lang, highlighted } = langState.current;
    if (!highlighted || lang === "plain") return [];
    const ext = languageExtension(lang);
    if (!(ext instanceof Promise)) return [ext, syntaxHighlighting(highlightStyle)];
    void ext.then((loaded) => {
      const v = view ?? viewRef.current;
      const cur = langState.current;
      if (!v || cur.lang !== lang || !cur.highlighted) return;
      v.dispatch({ effects: langC.current.reconfigure([loaded, syntaxHighlighting(highlightStyle)]) });
    });
    return [];
  };

  // Create once.
  useEffect(() => {
    if (!host.current) return;

    const flush = (view: EditorView) => {
      clearPending();
      const text = view.state.doc.toString();
      emit(text);
      const fn = cb.current.onChange;
      if (fn) startTransition(() => fn(text));
    };

    const extensions: Extension[] = [
      lineNumbers ? [lineNumbersExt(), errorGutterMarks] : errorLineTint,
      errorLinesField,
      searchField,
      searchHighlighter,
      langC.current.of(langContent(null)),
      baseTheme,
      metricsTheme(lineHeight, padding),
      wrapC.current.of(wrap ? EditorView.lineWrapping : []),
      indentC.current.of(indentUnitFacet.of(indentUnit)),
      attrsC.current.of(contentAttrs(ariaLabel)),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          const want = u.state.doc.length <= HIGHLIGHT_MAX;
          if (want !== langState.current.highlighted) {
            langState.current = { ...langState.current, highlighted: want };
            // Reconfigure after this update finishes (can't dispatch inside a listener).
            queueMicrotask(() => u.view.dispatch({ effects: langC.current.reconfigure(langContent(u.view)) }));
          }
        }
        if (u.docChanged && !readOnly) {
          const isExternal = u.transactions.every((tr) => tr.annotation(externalSync) === true);
          if (!isExternal) {
            if (u.state.doc.length > DEBOUNCE_ABOVE) {
              if (flushTimer.current) clearTimeout(flushTimer.current);
              flushTimer.current = setTimeout(() => flush(u.view), debounceMs(u.state.doc.length));
              setPendingEdit(flushNow, true);
            } else flush(u.view);
          }
        }
        // Status-bar caret position: throttled so typing doesn't re-render
        // the parent on every key.
        if ((u.selectionSet || u.docChanged) && cb.current.onCursorChange && !cursorTimer.current) {
          cursorTimer.current = setTimeout(() => {
            cursorTimer.current = null;
            const fn = cb.current.onCursorChange;
            const v = viewRef.current;
            if (fn && v) {
              const pos = cursorPos(v.state);
              startTransition(() => fn(pos));
            }
          }, 100);
        }
      }),
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true), placeholderC.current.of(emptyText ? placeholderExt(emptyText) : []));
    } else {
      extensions.push(
        history(),
        bracketsC.current.of(LANGUAGES[language].closeBrackets ? closeBrackets() : []),
        placeholderC.current.of(placeholder ? placeholderExt(placeholder) : []),
        keymap.of([{ key: "Tab", run: insertIndent }, ...closeBracketsKeymap, ...historyKeymap, ...defaultKeymap]),
        EditorView.domEventHandlers({
          paste(event, view) {
            const handler = cb.current.onPasteFormatted;
            const fmt = cb.current.formatPaste;
            if (!fmt) return false;
            const sel = view.state.selection.main;
            const replacingAll = view.state.doc.length === 0 || (sel.from === 0 && sel.to === view.state.doc.length);
            if (!replacingAll) return false;
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;
            const formatted = fmt(text);
            if (formatted === null) return false; // not formattable — let CodeMirror paste it as-is
            event.preventDefault();
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: formatted },
              selection: EditorSelection.cursor(0),
              scrollIntoView: true,
              userEvent: "input.paste",
            });
            flush(view);
            if (handler) startTransition(() => handler(formatted));
            return true;
          },
          // Clicking a button (Swap, Copy…) blurs the editor first: deliver
          // the pending edit so the action sees it.
          blur() {
            flushNow();
            return false;
          },
          drop(event) {
            const fn = cb.current.onDropFile;
            const file = event.dataTransfer?.files[0];
            if (!fn || !file) return false;
            event.preventDefault();
            fn(file);
            return true;
          },
        }),
      );
    }

    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc: value, extensions }),
    });
    viewRef.current = view;
    lastEmitted.current = value;
    inFlight.current = [];
    lastNonce.current = undefined;
    return () => {
      // Unmounting (tab switch, Hide inputs) must not lose a pending edit.
      flushNow();
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      view.destroy();
      viewRef.current = null;
    };
    // Editor is created once per mode; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, lineNumbers]);

  // The accessible name can change (e.g. "SQL input" → "XML input").
  useEffect(() => {
    viewRef.current?.dispatch({ effects: attrsC.current.reconfigure(contentAttrs(ariaLabel)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contentAttrs only reads readOnly, fixed per view
  }, [ariaLabel]);

  // External value → editor (sample, Format, Repair, Swap, share link…).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // Our own echo — possibly an older one committed late. Drop it and
    // everything emitted before it; the editor already holds newer text.
    const q = inFlight.current;
    const echo = q.lastIndexOf(value);
    if (echo !== -1) {
      q.splice(0, echo + 1);
      return;
    }
    if (value === lastEmitted.current) return;
    // A genuine external change wins over a still-pending debounced local edit
    // (actions that replace the text call `flushPendingEdits()` first).
    clearPending();
    lastEmitted.current = value;
    q.length = 0;
    if (view.state.doc.length === value.length && view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: externalSync.of(true),
      selection: EditorSelection.cursor(Math.min(view.state.selection.main.head, value.length)),
    });
  }, [value, clearPending]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || langState.current.lang === language) return;
    langState.current = { ...langState.current, lang: language };
    const effects = [langC.current.reconfigure(langContent(view))];
    if (!readOnly) effects.push(bracketsC.current.reconfigure(LANGUAGES[language].closeBrackets ? closeBrackets() : []));
    view.dispatch({ effects });
    // langContent/readOnly read refs and the latest render; language is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
  useEffect(() => {
    viewRef.current?.dispatch({ effects: wrapC.current.reconfigure(wrap ? EditorView.lineWrapping : []) });
  }, [wrap]);
  useEffect(() => {
    viewRef.current?.dispatch({ effects: indentC.current.reconfigure(indentUnitFacet.of(indentUnit)) });
  }, [indentUnit]);
  useEffect(() => {
    const text = readOnly ? emptyText : placeholder;
    viewRef.current?.dispatch({ effects: placeholderC.current.reconfigure(text ? placeholderExt(text) : []) });
  }, [readOnly, placeholder, emptyText]);
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setErrorLines.of(errorLines ?? []) });
  }, [errorLines, readOnly, lineNumbers]);
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setSearch.of(search?.trim() ?? "") });
  }, [search, readOnly, lineNumbers]);

  // Jump on mount (if requested) and whenever the nonce changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!jumpTo || !view || lastNonce.current === jumpTo.nonce) return;
    lastNonce.current = jumpTo.nonce;
    jumpView(view, jumpTo.line, jumpTo.col);
    cb.current.onJumped?.();
  }, [jumpTo, readOnly, lineNumbers]);

  return <div ref={host} className={cn("min-h-0 font-mono", className)} data-code-editor={language} data-json-editor={language === "json" ? "" : undefined} />;
}
