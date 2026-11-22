"use client";

/**
 * v2 "conv" workspace pieces shared by the SQL, XML and code formatters:
 * window, toolbar (segments, labelled select field, ⋯ menu), the two panes
 * (input editor + line-numbered output with a cream Copy) and the status
 * bar. Mirrors the mockup's conv family markup.
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { flushPendingEdits, LazyCodeEditor, type CodeLanguage } from "@/components/primitives/code-editor";
import { Tooltip } from "@/components/primitives/tooltip";
import { CodeView } from "@/components/tools/json-formatter/views/code-view";
import { cn } from "@/lib/cn";
import { highlight, type Lang } from "@/lib/highlight";
import { FileText, MoreHorizontal } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type DragEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { splitHighlightedLines } from "./split-lines.lib";

/** Above this many output lines, fall back to the single-<pre> CodeView. */
const MAX_LINE_ROWS = 4000;
const MAX_HIGHLIGHT = 1_000_000;

// ── Window ─────────────────────────────────────────────────────────────

export function FormatterWindow({
  children,
  onFile,
  dropTitle,
  dropHint,
}: {
  children: ReactNode;
  /** Accept a dropped file (text). Omit to disable drag-and-drop. */
  onFile?: (file: File) => void | Promise<void>;
  dropTitle?: string;
  dropHint?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  const handlers = onFile
    ? {
        onDragEnter: (e: DragEvent) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          depth.current++;
          if (depth.current === 1) setDragOver(true);
        },
        onDragLeave: () => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragOver(false);
        },
        onDragOver: (e: DragEvent) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        },
        onDrop: async (e: DragEvent) => {
          e.preventDefault();
          depth.current = 0;
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`${file.name} is over 5 MB`, { description: "Paste a smaller file — big files freeze the tab." });
            return;
          }
          await onFile(file);
          toast.success(`Loaded ${file.name}`, { duration: 1600 });
        },
      }
    : {};

  return (
    <div className="relative overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]" {...handlers}>
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-clay-light/60 bg-surface px-8 py-6">
            <FileText size={26} className="text-clay-light" aria-hidden />
            <p className="text-sm font-semibold text-text">{dropTitle ?? "Drop a file"}</p>
            {dropHint && <p className="text-xs text-text-faint">{dropHint}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────

export function FormatterToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3">{children}</div>
  );
}

export interface SegOption<T> {
  v: T;
  label: string;
}

/** Mockup segmented control: mono 13px keys on a recessed track. */
export function SegGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  trailing,
}: {
  label: string;
  options: ReadonlyArray<SegOption<T>>;
  /** `null` = none of the segments is active (value lives in the ⋯ menu). */
  value: T | null;
  onChange: (v: T) => void;
  /** Extra control rendered as the group's last segment (e.g. a "More" menu). */
  trailing?: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px]">
      {options.map((o) => (
        <SegButton key={String(o.v)} on={o.v === value} onClick={() => onChange(o.v)}>
          {o.label}
        </SegButton>
      ))}
      {trailing}
    </div>
  );
}

export function SegButton({
  on,
  onClick,
  children,
  className,
  ...rest
}: {
  on: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children" | "className">) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 font-mono text-[13px] font-medium transition-colors",
        on
          ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
          : "text-text-tertiary hover:bg-white/6 hover:text-text",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Mockup "field": a recessed label + value box; the value is a native select. */
export function FieldSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  suffix,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ v: T; label: string }>;
  onChange: (v: T) => void;
  /** Quiet trailing note, e.g. what "Auto" resolved to. */
  suffix?: string;
}) {
  return (
    <label className="flex min-h-11 flex-[0_1_240px] items-center gap-2 rounded-[10px] border border-white/10 bg-[#0d0d0c] px-3 text-[13px] text-text-faint focus-within:border-clay-light/50">
      {label}
      <select
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.v === e.target.value);
          if (next) onChange(next.v);
        }}
        className="min-w-0 grow cursor-pointer border-0 bg-transparent font-mono text-sm text-syntax-key outline-none [&>option]:bg-surface [&>option]:text-text"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      {suffix && <span className="shrink-0 font-mono text-xs text-text-ghost">{suffix}</span>}
    </label>
  );
}

/** Extra features the mockup doesn't show, behind one quiet ⋯ button. */
export function MoreMenu({ children, label = "More options" }: { children: ReactNode; label?: string }) {
  return (
    <DropdownMenu>
      <Tooltip content={label} side="bottom">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-[10px] text-text-tertiary transition-colors hover:bg-white/6 hover:text-text data-[state=open]:bg-white/6 data-[state=open]:text-text"
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="max-h-[min(70vh,560px)] w-64 overflow-y-auto">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Right-aligned shortcut hint inside a menu row. */
export function MenuHint({ children }: { children: ReactNode }) {
  return <span className="ml-auto pl-3 font-mono text-[11px] text-text-faint">{children}</span>;
}

// ── Panes ──────────────────────────────────────────────────────────────

export function PaneRow({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[440px] flex-wrap">{children}</div>;
}

/** `idle` = nothing to do yet; `pending` = a format is in flight (pulses). */
export type StatusTone = "ok" | "error" | "pending" | "idle";

const DOT_TONE: Record<StatusTone, string> = {
  ok: "text-success",
  error: "text-error",
  pending: "text-text-faint",
  idle: "text-text-faint",
};

/** Left pane: header (label + status dot) over the editor. */
export function InputPane({
  label,
  status,
  tone,
  children,
}: {
  label: string;
  status: string;
  tone: StatusTone;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-[1_1_360px] flex-col border-r border-border-subtle">
      <div className="flex min-h-[46px] items-center gap-2 border-b border-border-subtle px-4">
        <span className="text-[13px] font-bold text-text">{label}</span>
        <span className={cn("inline-flex items-center gap-1.5 text-xs", DOT_TONE[tone])} aria-live="polite">
          <span aria-hidden className={cn("size-1.5 rounded-full bg-current", tone === "pending" && "motion-safe:animate-pulse")} />
          {status}
        </span>
      </div>
      {/* The editor is absolutely filled so the pane takes the row's height
          (side by side) or a 300px floor (stacked). */}
      <div className="relative min-h-[300px] flex-1">
        <div className="absolute inset-0 pl-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Code-editor grammar per highlighter language. Languages without a grammar
 * here (GraphQL…) edit as plain text; the output pane keeps its own
 * highlighter, so formatted output is still coloured.
 */
const EDITOR_LANG: Partial<Record<Lang, CodeLanguage>> = {
  json: "json",
  yaml: "yaml",
  xml: "xml",
  css: "css",
  markdown: "markdown",
  sql: "sql",
  typescript: "typescript",
};

/**
 * Editable editor for the input pane — mockup metrics (13px / 1.75, line
 * gutter), soft-wrapped. The shared lazy CodeMirror: only visible lines
 * render, so a multi-MB paste types instantly. Big documents reach
 * `onChange` debounced — actions that read or replace the input must call
 * `flushPendingEdits()` first (see `useLiveText`).
 */
export function InputEditor({
  value,
  onChange,
  lang,
  placeholder,
  ariaLabel,
  errorLine,
}: {
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  placeholder: string;
  ariaLabel: string;
  /** 1-based line of the parse error — its gutter number turns red. */
  errorLine?: number;
}) {
  const errorLines = useMemo(() => (errorLine ? [errorLine] : []), [errorLine]);
  return (
    <LazyCodeEditor
      language={EDITOR_LANG[lang] ?? "plain"}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      errorLines={errorLines}
      wrap
    />
  );
}

/** Right pane: header (label, summary, cream Copy), error, then the body. */
export function OutputPane({
  label,
  summary,
  onCopy,
  canCopy,
  error,
  children,
}: {
  label: string;
  summary?: string;
  onCopy: () => Promise<boolean>;
  canCopy: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async () => {
    if (!canCopy) {
      toast("Nothing to copy yet", { duration: 1000 });
      return;
    }
    const ok = await onCopy();
    if (!ok) {
      toast.error("Couldn't copy to clipboard");
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  }, [canCopy, onCopy]);

  return (
    <div className="flex min-w-0 flex-[1_1_360px] flex-col">
      <div className="flex min-h-[46px] items-center gap-2 border-b border-border-subtle pr-2 pl-4">
        <span className="text-[13px] font-bold text-text">{label}</span>
        {summary && <span className="text-xs text-text-faint">{summary}</span>}
        <span className="grow" />
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!canCopy}
          className="btn-action inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {error && (
        <div role="alert" className="m-3.5 whitespace-pre-wrap break-words rounded-[10px] border border-error-border bg-error-bg px-3.5 py-3 text-[13px] text-error-text">
          {error}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Line-numbered, soft-wrapped, syntax-coloured output (mockup output body).
 * Each line is its own row so wrapped lines keep their number aligned.
 * Very long outputs fall back to the single-<pre> CodeView.
 */
export function OutputLines({ text, lang, placeholder = "Output will appear here." }: { text: string; lang: Lang; placeholder?: string }) {
  const html = useMemo(() => (text ? highlight(text, lang, MAX_HIGHLIGHT) : ""), [text, lang]);
  const lines = useMemo(() => (html ? splitHighlightedLines(html) : []), [html]);
  const scroll = "h-[max(var(--ws-min,440px),calc(100dvh-var(--chrome-top,165px)-176px))] grow overflow-auto";

  if (!text) {
    return <p className="px-4 py-3.5 font-mono text-[12.5px] text-text-faint sm:text-[13px]">{placeholder}</p>;
  }
  if (lines.length > MAX_LINE_ROWS) {
    return (
      <div className="h-[max(var(--ws-min,440px),calc(100dvh-var(--chrome-top,165px)-176px))] min-h-0">
        <CodeView variant="v2" value={text} highlighted={html} indent="2" lang={lang} maxHighlightSize={MAX_HIGHLIGHT} />
      </div>
    );
  }
  return (
    <div className={scroll}>
      <div className="py-3.5 font-mono text-[12.5px] leading-[1.75] text-syntax-plain sm:text-[13px]">
        {lines.map((l, i) => (
          <div key={i} className="flex">
            <span aria-hidden className="w-[30px] shrink-0 select-none pr-3 text-right text-text-ghost sm:w-10">
              {i + 1}
            </span>
            <span
              className="min-w-0 whitespace-pre-wrap break-words pr-3.5"
              dangerouslySetInnerHTML={{ __html: l || " " }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Status bar ─────────────────────────────────────────────────────────

export function FormatterStatusBar({
  tone,
  text,
  detail,
  extra,
}: {
  tone: StatusTone;
  text: string;
  detail?: string;
  /** Secondary facts, hidden on phones. */
  extra?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
      <span className={cn("min-w-0 break-words", DOT_TONE[tone])}>● {text}</span>
      {detail && <span>{detail}</span>}
      {extra && <span className="hidden sm:inline">{extra}</span>}
      <span className="grow" />
      <span className="text-success-text">Local-only</span>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Read the clipboard into `set`; toasts on failure. */
export async function pasteInto(set: (v: string) => void): Promise<void> {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      // Pending keystrokes land first, so the paste replaces them in order.
      flushPendingEdits();
      set(text);
    }
    else toast("Clipboard is empty", { duration: 1000 });
  } catch {
    toast.error("Couldn't read clipboard");
  }
}

/** Save `text` as a file. */
export function downloadText(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
