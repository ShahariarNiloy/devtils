import type { RefObject } from "react";

/**
 * Public types of the shared code editor. Kept apart from the CodeMirror
 * module so the lazy wrapper (first-load code) can import them without
 * pulling the editor chunk in.
 */

/**
 * Languages the editor can highlight. `json` ships inside the editor chunk;
 * any other language is `import()`ed the first time an editor asks for it
 * (see `languages.ts`), so it never costs a page that doesn't use it.
 */
export type CodeLanguage = "json" | "plain" | "yaml" | "sql" | "xml" | "html" | "markdown" | "css" | "typescript";

/** Imperative handle (`editorRef`). */
export interface CodeEditorHandle {
  /** Deliver any pending debounced edit to `onChange` now, and return the live document. */
  flush: () => string;
}

export interface CodeEditorProps {
  /** Receives the imperative handle once the editor (lazy chunk) has mounted. */
  editorRef?: RefObject<CodeEditorHandle | null>;
  value: string;
  /** Omit for a read-only editor. */
  onChange?: (v: string) => void;
  /** Syntax highlighting and bracket behaviour. Default `json`. */
  language?: CodeLanguage;
  /** Text one Tab / indent level inserts. Default two spaces. */
  indentUnit?: string;
  onCursorChange?: (pos: { ln: number; col: number }) => void;
  /** Called with the formatted text when `formatPaste` accepts a paste into an empty (or fully selected) editor. */
  onPasteFormatted?: (formatted: string) => void;
  /**
   * Formats pasted text, or returns null to paste it as-is. Only consulted
   * when the paste replaces the whole document.
   */
  formatPaste?: (text: string) => string | null;
  /** Called instead of CodeMirror's insert-at-drop when a file is dropped on the editor. */
  onDropFile?: (file: File) => void;
  /** Placeholder for an editable, empty editor. */
  placeholder?: string;
  /** Empty-state text for read-only mode. */
  emptyText?: string;
  /** 1-based lines with problems — gutter numbers turn red (or the line is tinted when there's no gutter). */
  errorLines?: readonly number[];
  /**
   * Move the caret to line/col (1-based), scroll it into view and focus.
   * Applied on mount and whenever `nonce` changes; clear it from
   * `onJumped` if a remount shouldn't jump again.
   */
  jumpTo?: { line: number; col: number; nonce: number };
  onJumped?: () => void;
  /** Case-insensitive term to highlight (visible lines only). */
  search?: string;
  wrap?: boolean;
  /** Line-number gutter. Default true. */
  lineNumbers?: boolean;
  /** Unitless line height. Default 1.75. */
  lineHeight?: number;
  /** CSS padding of the text area. Default `14px 16px 14px 0` (the gutter supplies the left edge). */
  padding?: string;
  /** Accessible name of the text area. */
  ariaLabel?: string;
  /** Host classes — font size, height, background. Default `h-full text-[12px] sm:text-[13px]`. */
  className?: string;
}

export const DEFAULT_LINE_HEIGHT = 1.75;
export const DEFAULT_PADDING = "14px 16px 14px 0";
/** Left padding of the pre-load placeholder when a gutter is shown (≈ the line-number gutter width). */
export const GUTTER_PLACEHOLDER_PAD = "48px";
export const DEFAULT_HOST_CLASS = "h-full text-[12px] sm:text-[13px]";
