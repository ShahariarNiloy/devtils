"use client";

import {
  Check,
  ChevronDown,
  Clipboard,
  ClipboardCopy,
  Database,
  Download,
  FileText,
  Link2,
  Lock,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/primitives/resizable";
import { CodeView } from "@/components/tools/json-formatter/views/code-view";
import {
  buildHunks,
  buildSideRows,
  diffLines,
  type SideRow,
  type WordOp,
} from "@/lib/diff";
import { highlight } from "@/lib/highlight";
import { useShortcut } from "@/lib/keyboard";
import { useIsMobile } from "@/lib/use-is-mobile";
import type { Tool } from "@/lib/tools-registry";
import { SqlFormatterContent } from "./content";
import {
  COPY_AS_OPTIONS,
  DIALECTS,
  type CopyAsFormat,
  type DialectId,
  type SqlFormatOptions,
} from "./sql-formatter.lib";
import {
  useSqlFormatter,
  type OutputMode,
  type ViewMode,
} from "./use-sql-formatter";

const MAX_HIGHLIGHT = 1_000_000;

/**
 * SQL formatter orchestrator. The dialect picker + case/indent chips
 * cover ~95% of real configuration; logical-operator placement, comma
 * style, and indent style live in the Options dropdown.
 *
 * The diff view (toggle in the toolbar) reuses the diff-checker engine
 * to show original ↔ formatted side-by-side — the answer to the user's
 * question "did the formatter actually change anything semantically?".
 */
export function SqlFormatter({ tool }: { tool: Tool }) {
  const s = useSqlFormatter();
  const isMobile = useIsMobile();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  // Pre-compute the highlighted output once per (output, dialect) change
  // so it doesn't re-tokenise on unrelated re-renders.
  const outputHtml = useMemo(
    () => (s.output ? highlight(s.output, "sql", MAX_HIGHLIGHT) : ""),
    [s.output],
  );

  // ── Diff (lazy, only when the view is on) ───────────────────────────
  const diffRows = useMemo(() => {
    if (s.view !== "diff" || !s.output) return null;
    const ops = diffLines(s.input, s.output, { ignoreWhitespace: false });
    return { rows: buildSideRows(ops), hunks: buildHunks(ops) };
  }, [s.view, s.input, s.output]);

  // ── Actions ─────────────────────────────────────────────────────────
  const onPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) s.setInput(text);
    } catch {
      toast.error("Couldn't read clipboard");
    }
  }, [s]);

  const onCopy = useCallback(async () => {
    if (!s.output) {
      toast("Nothing to copy yet", { duration: 1000 });
      return;
    }
    const ok = await s.copyOutput();
    if (ok) toast.success(`Copied ${s.output.length.toLocaleString()} chars`);
    else toast.error("Couldn't copy to clipboard");
  }, [s]);

  const onCopyAs = useCallback(
    async (fmt: CopyAsFormat) => {
      if (!s.output) {
        toast("Nothing to copy yet", { duration: 1000 });
        return;
      }
      const ok = await s.copyAs(fmt);
      if (ok) {
        const opt = COPY_AS_OPTIONS.find((o) => o.id === fmt);
        toast.success(`Copied as ${opt?.label ?? fmt}`);
      } else {
        toast.error("Couldn't copy to clipboard");
      }
    },
    [s],
  );

  const onShare = useCallback(async () => {
    const url = await s.share();
    if (url) {
      toast.success("Share link copied", {
        description: "Anyone with the link sees this query + dialect.",
        duration: 2400,
      });
    } else {
      toast.error("Couldn't generate share link");
    }
  }, [s]);

  const onDownload = useCallback(() => {
    if (s.download()) {
      toast.success("formatted.sql downloaded", { duration: 1600 });
    } else {
      toast("Nothing to download", { duration: 1000 });
    }
  }, [s]);

  // ── Shortcuts ───────────────────────────────────────────────────────
  useShortcut({ key: "/", ignoreInEditable: true }, (e) => {
    e.preventDefault();
    workspaceRef.current?.querySelector("textarea")?.focus();
  });
  useShortcut({ key: "c", meta: true, shift: true }, (e) => {
    e.preventDefault();
    void onCopy();
  });
  useShortcut({ key: "d", meta: true, shift: true, ignoreInEditable: true }, (e) => {
    e.preventDefault();
    s.setView(s.view === "diff" ? "output" : "diff");
  });

  // ── Drag-and-drop a .sql file ───────────────────────────────────────
  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    dragDepth.current++;
    if (dragDepth.current === 1) setDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);
  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      await s.acceptDroppedFile(file);
      toast.success(`Loaded ${file.name}`, { duration: 1600 });
    },
    [s],
  );

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <ToolShell tool={tool}>
      <div
        ref={workspaceRef}
        className="relative flex flex-col gap-3"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {dragOver && <DropOverlay />}

        <TrustHeader />

        {/* Toolbar */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface/95 px-3 py-2 shadow-card backdrop-blur">
          <DialectPicker value={s.dialect} onChange={s.setDialect} />
          <div className="hidden h-6 w-px bg-border-subtle md:block" />

          <ChipGroup<NonNullable<SqlFormatOptions["keywordCase"]>>
            label="case"
            options={[
              { v: "upper", label: "UPPER" },
              { v: "lower", label: "lower" },
              { v: "preserve", label: "as is" },
            ]}
            value={s.options.keywordCase ?? "upper"}
            onChange={(v) => s.setOption("keywordCase", v)}
          />
          <ChipGroup
            label="indent"
            options={[
              { v: 2, label: "2" },
              { v: 4, label: "4" },
              { v: 8, label: "8" },
            ]}
            value={s.options.tabWidth ?? 2}
            onChange={(v) => s.setOption("tabWidth", v)}
          />
          <ChipGroup
            label="width"
            options={[
              { v: 50, label: "50" },
              { v: 80, label: "80" },
              { v: 120, label: "120" },
            ]}
            value={s.options.expressionWidth ?? 50}
            onChange={(v) => s.setOption("expressionWidth", v)}
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusPill
              pending={s.pending}
              elapsed={s.elapsed}
              hasError={!!s.error}
            />
            <ModeToggle mode={s.mode} onChange={s.setMode} />
            {!isMobile && (
              <ViewToggle view={s.view} onChange={s.setView} canDiff={!!s.output} />
            )}
            <button
              type="button"
              onClick={onCopy}
              disabled={!s.output}
              aria-label="Copy formatted SQL"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-bg text-text-faint transition-colors hover:bg-surface-soft hover:text-text disabled:opacity-40 cursor-pointer"
            >
              <ClipboardCopy size={13} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-bg px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
            >
              <Link2 size={13} aria-hidden />
              Share
            </button>
            <MoreMenu
              options={s.options}
              setOption={s.setOption}
              onDownload={onDownload}
              onLoadSample={s.loadSample}
              onClear={s.clear}
              onCopyAs={onCopyAs}
              canDownload={!!s.output}
              hasOutput={!!s.output}
            />
          </div>
        </div>

        {/* Workspace */}
        {isMobile ? (
          <div className="flex flex-col gap-3">
            <InputCard
              value={s.input}
              onChange={s.setInput}
              onPaste={onPaste}
              onClear={s.clear}
            />
            <OutputCard
              output={s.output}
              outputHtml={outputHtml}
              error={s.error}
              errorLine={s.errorLine}
            />
          </div>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            className="h-[65vh] rounded-xl border border-border bg-surface shadow-card overflow-hidden"
          >
            <ResizablePanel defaultSize={50} minSize={25}>
              <InputCard
                value={s.input}
                onChange={s.setInput}
                onPaste={onPaste}
                onClear={s.clear}
                bare
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              {s.view === "diff" && diffRows ? (
                <DiffView rows={diffRows.rows} />
              ) : (
                <OutputCard
                  output={s.output}
                  outputHtml={outputHtml}
                  error={s.error}
                  errorLine={s.errorLine}
                  bare
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {/* Stats footer */}
        <p className="px-1 font-mono text-sm text-text-faint">
          {s.stats.inputLines}→{s.stats.outputLines} lines ·{" "}
          {s.stats.inputChars.toLocaleString()}→
          {s.stats.outputChars.toLocaleString()} chars ·{" "}
          {s.stats.statementCount} statement{s.stats.statementCount === 1 ? "" : "s"}
          {!isMobile && (
            <>
              {" · "}
              <Kbd>/</Kbd> focus · <Kbd>⌘⇧C</Kbd> copy · <Kbd>⌘⇧D</Kbd> diff
            </>
          )}
        </p>

        <SqlFormatterContent />
      </div>
    </ToolShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function TrustHeader() {
  return (
    <div className="flex items-center gap-2 px-1 text-sm text-text-faint">
      <Lock size={12} className="text-success" aria-hidden />
      <span>
        <span className="text-text">Stays on your device.</span> SQL never
        leaves the browser — the formatter runs locally.
      </span>
    </div>
  );
}

function DialectPicker({
  value,
  onChange,
}: {
  value: DialectId;
  onChange: (v: DialectId) => void;
}) {
  const current = DIALECTS.find((d) => d.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-bg px-2.5 text-sm text-text transition-colors hover:bg-surface-soft cursor-pointer"
          aria-label="Dialect"
        >
          <Database size={13} aria-hidden className="text-text-faint" />
          <span className="font-mono">{current?.label ?? value}</span>
          <ChevronDown size={13} aria-hidden className="text-text-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Dialect</DropdownMenuLabel>
        {DIALECTS.map((d) => {
          const selected = d.id === value;
          return (
            <DropdownMenuItem
              key={d.id}
              onSelect={() => onChange(d.id)}
              className="pl-7"
            >
              {selected && (
                <Check
                  size={12}
                  aria-hidden
                  className="absolute left-2 text-text"
                />
              )}
              <div className="flex flex-col">
                <span className="font-mono">{d.label}</span>
                <span className="font-mono text-sm text-text-faint">{d.hint}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ v: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="font-mono text-sm uppercase tracking-wider text-text-faint">
        {label}
      </span>
      <div className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-bg p-0.5">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`inline-flex h-7 items-center rounded px-2 font-mono text-sm transition-colors cursor-pointer ${
              value === o.v
                ? "bg-surface text-text shadow-sm"
                : "text-text-faint hover:text-text"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusPill({
  pending,
  elapsed,
  hasError,
}: {
  pending: boolean;
  elapsed: number;
  hasError: boolean;
}) {
  if (hasError) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-danger/30 bg-danger/5 px-2 font-mono text-sm text-danger">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
        parse error
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border-subtle bg-bg px-2 font-mono text-sm text-text-faint">
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${pending ? "animate-pulse bg-brand" : "bg-success"}`}
      />
      {pending ? "formatting…" : `${elapsed}ms`}
    </span>
  );
}

function ViewToggle({
  view,
  onChange,
  canDiff,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
  canDiff: boolean;
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-bg p-0.5">
      <button
        type="button"
        onClick={() => onChange("output")}
        className={`inline-flex h-7 items-center rounded px-2.5 text-sm transition-colors cursor-pointer ${
          view === "output"
            ? "bg-surface text-text shadow-sm"
            : "text-text-faint hover:text-text"
        }`}
      >
        Output
      </button>
      <button
        type="button"
        onClick={() => onChange("diff")}
        disabled={!canDiff}
        className={`inline-flex h-7 items-center rounded px-2.5 text-sm transition-colors disabled:opacity-40 cursor-pointer ${
          view === "diff"
            ? "bg-surface text-text shadow-sm"
            : "text-text-faint hover:text-text"
        }`}
      >
        Diff
      </button>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: OutputMode;
  onChange: (m: OutputMode) => void;
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-bg p-0.5">
      <button
        type="button"
        onClick={() => onChange("format")}
        className={`inline-flex h-7 items-center rounded px-2.5 text-sm transition-colors cursor-pointer ${
          mode === "format"
            ? "bg-surface text-text shadow-sm"
            : "text-text-faint hover:text-text"
        }`}
        aria-label="Format mode"
      >
        Format
      </button>
      <button
        type="button"
        onClick={() => onChange("minify")}
        className={`inline-flex h-7 items-center rounded px-2.5 text-sm transition-colors cursor-pointer ${
          mode === "minify"
            ? "bg-surface text-text shadow-sm"
            : "text-text-faint hover:text-text"
        }`}
        aria-label="Minify mode"
      >
        Minify
      </button>
    </div>
  );
}

function MoreMenu({
  options,
  setOption,
  onDownload,
  onLoadSample,
  onClear,
  onCopyAs,
  canDownload,
  hasOutput,
}: {
  options: SqlFormatOptions;
  setOption: <K extends keyof SqlFormatOptions>(
    key: K,
    value: SqlFormatOptions[K],
  ) => void;
  onDownload: () => void;
  onLoadSample: () => void;
  onClear: () => void;
  onCopyAs: (fmt: CopyAsFormat) => void;
  canDownload: boolean;
  hasOutput: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-bg px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
        >
          Options
          <ChevronDown size={13} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Case</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() =>
            setOption(
              "identifierCase",
              options.identifierCase === "upper" ? "preserve" : "upper",
            )
          }
        >
          {options.identifierCase === "upper" ? "✓ " : ""}Uppercase identifiers
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            setOption(
              "functionCase",
              options.functionCase === "upper" ? "preserve" : "upper",
            )
          }
        >
          {options.functionCase === "upper" ? "✓ " : ""}Uppercase functions
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            setOption(
              "dataTypeCase",
              options.dataTypeCase === "upper" ? "preserve" : "upper",
            )
          }
        >
          {options.dataTypeCase === "upper" ? "✓ " : ""}Uppercase data types
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Layout</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() =>
            setOption(
              "logicalOperatorNewline",
              options.logicalOperatorNewline === "before" ? "after" : "before",
            )
          }
        >
          AND/OR at {options.logicalOperatorNewline === "before" ? "start of next line" : "end of line"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setOption("leadingComma", !options.leadingComma)}
        >
          {options.leadingComma ? "✓ " : ""}Leading commas
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setOption("useTabs", !options.useTabs)}
        >
          {options.useTabs ? "✓ " : ""}Use tabs
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            setOption(
              "newlineBeforeSemicolon",
              !options.newlineBeforeSemicolon,
            )
          }
        >
          {options.newlineBeforeSemicolon ? "✓ " : ""}Newline before `;`
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Copy as</DropdownMenuLabel>
        {COPY_AS_OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onSelect={() => onCopyAs(o.id)}
            disabled={!hasOutput}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <span>{o.label}</span>
              <span className="font-mono text-sm text-text-faint">{o.hint}</span>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDownload} disabled={!canDownload}>
          <Download size={13} aria-hidden />
          Download .sql
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLoadSample}>Load sample</DropdownMenuItem>
        <DropdownMenuItem onSelect={onClear}>Clear input</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InputCard({
  value,
  onChange,
  onPaste,
  onClear,
  bare,
}: {
  value: string;
  onChange: (v: string) => void;
  onPaste: () => void;
  onClear: () => void;
  bare?: boolean;
}) {
  const wrapper = bare
    ? "h-full flex flex-col"
    : "rounded-xl border border-border bg-surface shadow-card overflow-hidden flex flex-col h-[50vh]";
  return (
    <div className={wrapper}>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
          Input
        </span>
        <span className="font-mono text-sm text-text-faint">
          {value ? `${value.length.toLocaleString()} chars` : "paste SQL"}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPaste}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
          >
            <Clipboard size={13} aria-hidden />
            Paste
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!value}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-danger disabled:opacity-40 cursor-pointer"
          >
            <Trash2 size={13} aria-hidden />
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <CodeView
          value={value}
          onChange={onChange}
          indent="2"
          lang="sql"
          placeholder="Paste any SQL — minified, one-liner, or multi-statement…"
          maxHighlightSize={MAX_HIGHLIGHT}
          wrap
        />
      </div>
    </div>
  );
}

function OutputCard({
  output,
  outputHtml,
  error,
  errorLine,
  bare,
}: {
  output: string;
  outputHtml: string;
  error: string | null;
  errorLine: number | undefined;
  bare?: boolean;
}) {
  const wrapper = bare
    ? "h-full flex flex-col"
    : "rounded-xl border border-border bg-surface shadow-card overflow-hidden flex flex-col h-[50vh]";
  return (
    <div className={wrapper}>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
          Output
        </span>
        <span className="font-mono text-sm text-text-faint">
          {output ? `${output.length.toLocaleString()} chars` : ""}
        </span>
      </div>
      {error ? (
        <div className="flex-1 overflow-auto px-3 py-3 font-mono text-[13px] leading-relaxed text-danger">
          <p className="mb-1 font-semibold">
            Parse error{errorLine ? ` on line ${errorLine}` : ""}
          </p>
          <pre className="whitespace-pre-wrap break-all">{error}</pre>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <CodeView
            value={output}
            highlighted={outputHtml}
            indent="2"
            lang="sql"
            maxHighlightSize={MAX_HIGHLIGHT}
            wrap
          />
        </div>
      )}
    </div>
  );
}

function DiffView({ rows }: { rows: SideRow[] }) {
  return (
    <div className="h-full overflow-y-auto overflow-x-auto font-mono text-[12.5px] leading-[1.65]">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-10" />
          <col />
        </colgroup>
        <tbody>
          {rows.map((r, i) => (
            <DiffRow key={i} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffRow({ row }: { row: SideRow }) {
  if (row.kind === "equal") {
    return (
      <tr>
        <Gutter num={row.leftLine} />
        <Cell text={row.text} />
        <Gutter num={row.rightLine} />
        <Cell text={row.text} />
      </tr>
    );
  }
  if (row.kind === "delete") {
    return (
      <tr>
        <Gutter num={row.leftLine} tone="danger" />
        <Cell text={row.text} tone="danger" />
        <Gutter />
        <Cell tone="empty" />
      </tr>
    );
  }
  if (row.kind === "insert") {
    return (
      <tr>
        <Gutter />
        <Cell tone="empty" />
        <Gutter num={row.rightLine} tone="success" />
        <Cell text={row.text} tone="success" />
      </tr>
    );
  }
  return (
    <tr>
      <Gutter num={row.leftLine} tone="danger" />
      <Cell tone="danger" words={row.leftWords} />
      <Gutter num={row.rightLine} tone="success" />
      <Cell tone="success" words={row.rightWords} />
    </tr>
  );
}

function Gutter({ num, tone }: { num?: number; tone?: "success" | "danger" }) {
  const toneClass =
    tone === "success"
      ? "text-success bg-success/5"
      : tone === "danger"
        ? "text-danger bg-danger/5"
        : "text-text-faint";
  return (
    <td
      className={`select-none border-r border-border-subtle px-2 text-right align-top tabular-nums ${toneClass}`}
    >
      {num ?? ""}
    </td>
  );
}

function Cell({
  text,
  tone,
  words,
}: {
  text?: string;
  tone?: "success" | "danger" | "empty";
  words?: WordOp[];
}) {
  const bg =
    tone === "success"
      ? "bg-success/5"
      : tone === "danger"
        ? "bg-danger/5"
        : tone === "empty"
          ? "bg-border-subtle/30"
          : "";
  if (words) {
    return (
      <td className={`whitespace-pre-wrap break-all px-3 py-0.5 align-top ${bg}`}>
        {words.map((w, i) => {
          if (w.kind === "equal") return <span key={i}>{w.text}</span>;
          const cls =
            w.kind === "insert"
              ? "bg-success/25 text-success rounded-sm"
              : "bg-danger/25 text-danger rounded-sm";
          return (
            <span key={i} className={cls}>
              {w.text}
            </span>
          );
        })}
      </td>
    );
  }
  return (
    <td className={`whitespace-pre-wrap break-all px-3 py-0.5 align-top ${bg}`}>
      {text}
    </td>
  );
}

function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-bg/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-brand/60 bg-surface/95 px-8 py-6 shadow-card">
        <FileText size={28} className="text-brand" aria-hidden />
        <p className="font-serif italic text-text">Drop a .sql file</p>
        <p className="font-mono text-sm text-text-faint">
          we&apos;ll auto-detect the dialect
        </p>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border-subtle bg-bg px-1 font-mono text-[11px] text-text-faint">
      {children}
    </kbd>
  );
}
