"use client";

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
import { highlight } from "@/lib/highlight";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  Check,
  ChevronDown,
  Clipboard,
  ClipboardCopy,
  Download,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  getLanguage,
  LANGUAGES,
  toHighlighterLang,
  type FormatOptions,
  type LanguageId,
} from "./code-formatter.lib";
import { CodeFormatterContent } from "./content";
import { useCodeFormatter } from "./use-code-formatter";

/**
 * Code formatter / formatter. Pastes any supported source, returns it
 * formatted with Prettier. Debounced auto-format (no Format button to
 * click) — typing slows or stops, output refreshes.
 *
 * Per the AGENTS.md UX principles:
 *   - Honest metrics: parse errors render in the output pane verbatim
 *     with a line/column hint, not silently swallowed.
 *   - Stays on your device: nothing is sent to a server. The formatter
 *     bundles run as code-split chunks in the user's browser.
 */
export function CodeFormatter({ tool }: { tool: Tool }) {
  const s = useCodeFormatter();
  const isMobile = useIsMobile();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const lang = getLanguage(s.language);
  const groups = new Set(lang.optionGroups);
  const hLang = toHighlighterLang(s.language);
  // 1 MB cap — covers reformatting a 14 K-line stylesheet (the highest
  // realistic single-file paste). The default 100 KB cap in CodeView is
  // tuned for the json-formatter's live-edit dynamics; code-formatter
  // is paste-and-read, so the per-keystroke overlay cost matters less.
  const MAX_HIGHLIGHT = 1_000_000;
  // Pre-compute the output's highlighted HTML so the read-only CodeView
  // doesn't re-tokenise on unrelated re-renders (cursor, status pill).
  const outputHtml = useMemo(
    () => (s.output ? highlight(s.output, hLang, MAX_HIGHLIGHT) : ""),
    [s.output, hLang]
  );

  // ── Actions ─────────────────────────────────────────────────────────
  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) s.setInput(text);
    } catch {
      toast.error("Couldn't read clipboard");
    }
  };

  const onCopy = useCallback(async () => {
    if (!s.output) {
      toast("Nothing to copy yet", { duration: 1000 });
      return;
    }
    try {
      await navigator.clipboard.writeText(s.output);
      toast.success(`Copied ${s.output.length.toLocaleString()} chars`);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }, [s.output]);

  const onDownload = useCallback(() => {
    if (!s.output) return;
    const blob = new Blob([s.output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted.${lang.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`formatted.${lang.extension} downloaded`, { duration: 1600 });
  }, [s.output, lang.extension]);

  // ── Shortcuts ───────────────────────────────────────────────────────
  useShortcut({ key: "/", ignoreInEditable: true }, (e) => {
    e.preventDefault();
    // CodeView owns its textarea internally; find the first one inside
    // the workspace and focus it.
    workspaceRef.current?.querySelector("textarea")?.focus();
  });
  useShortcut({ key: "c", meta: true, shift: true }, (e) => {
    e.preventDefault();
    void onCopy();
  });

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <ToolShell tool={tool}>
      <div ref={workspaceRef} className="flex flex-col gap-3">
        {/* Toolbar */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface/95 px-3 py-2 shadow-card backdrop-blur">
          <LanguagePicker value={s.language} onChange={s.setLanguage} />

          <div className="hidden h-6 w-px bg-border-subtle md:block" />

          {groups.has("indent") && (
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
          )}
          {groups.has("width") && (
            <ChipGroup
              label="width"
              options={[
                { v: 80, label: "80" },
                { v: 100, label: "100" },
                { v: 120, label: "120" },
              ]}
              value={s.options.printWidth ?? 80}
              onChange={(v) => s.setOption("printWidth", v)}
            />
          )}
          {groups.has("js") && (
            <ChipGroup<"all" | "es5" | "none">
              label="trailing,"
              options={[
                { v: "all", label: "all" },
                { v: "es5", label: "es5" },
                { v: "none", label: "none" },
              ]}
              value={s.options.trailingComma ?? "all"}
              onChange={(v) => s.setOption("trailingComma", v)}
            />
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusPill
              pending={s.pending}
              elapsed={s.elapsed}
              hasError={!!s.error}
            />
            <button
              type="button"
              onClick={onCopy}
              disabled={!s.output}
              aria-label="Copy output"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-bg text-text-faint transition-colors hover:bg-surface-soft hover:text-text disabled:opacity-40 cursor-pointer"
            >
              <ClipboardCopy size={13} aria-hidden />
            </button>
            <MoreMenu
              options={s.options}
              setOption={s.setOption}
              groups={groups}
              onDownload={onDownload}
              onLoadSample={s.loadSample}
              onClear={s.clear}
              canDownload={!!s.output}
            />
          </div>
        </div>

        {/* Input ↔ Output panes — both backed by CodeView for syntax
            highlighting, line-number gutter, and 16px monospace font. */}
        {isMobile ? (
          <div className="flex flex-col gap-3">
            <InputCard
              value={s.input}
              onChange={s.setInput}
              onPaste={onPaste}
              onClear={s.clear}
              lang={hLang}
              maxHighlight={MAX_HIGHLIGHT}
            />
            <OutputCard
              output={s.output}
              outputHtml={outputHtml}
              error={s.error}
              errorLine={s.errorLine}
              lang={hLang}
              maxHighlight={MAX_HIGHLIGHT}
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
                lang={hLang}
                maxHighlight={MAX_HIGHLIGHT}
                bare
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <OutputCard
                output={s.output}
                outputHtml={outputHtml}
                error={s.error}
                errorLine={s.errorLine}
                lang={hLang}
                maxHighlight={MAX_HIGHLIGHT}
                bare
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {/* Stats footer */}
        <p className="px-1 font-mono text-sm text-text-faint">
          {s.stats.inputLines}→{s.stats.outputLines} lines ·{" "}
          {s.stats.inputChars.toLocaleString()}→
          {s.stats.outputChars.toLocaleString()} chars
          {s.stats.delta !== 0 && (
            <>
              {" "}
              <span
                className={s.stats.delta < 0 ? "text-success" : "text-warning"}
              >
                ({s.stats.delta > 0 ? "+" : ""}
                {s.stats.delta.toLocaleString()})
              </span>
            </>
          )}
        </p>

        <CodeFormatterContent />
      </div>
    </ToolShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function LanguagePicker({
  value,
  onChange,
}: {
  value: LanguageId;
  onChange: (v: LanguageId) => void;
}) {
  const current = LANGUAGES.find((l) => l.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-brand px-2.5 text-sm text-text-on-sage transition-colors hover:bg-brand/80 cursor-pointer"
          aria-label="Language"
        >
          <span className="font-mono">{current?.label ?? value}</span>
          <ChevronDown size={13} aria-hidden className="text-inherit" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        {LANGUAGES.map((l) => {
          const selected = l.id === value;
          return (
            <DropdownMenuItem
              key={l.id}
              onSelect={() => onChange(l.id)}
              className="pl-7"
            >
              {selected && (
                <Check
                  size={12}
                  aria-hidden
                  className="absolute left-2 text-text"
                />
              )}
              <span className="font-mono">{l.label}</span>
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
      <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-error-border bg-error-bg px-2 font-mono text-sm text-error-text">
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

function MoreMenu({
  options,
  setOption,
  groups,
  onDownload,
  onLoadSample,
  onClear,
  canDownload,
}: {
  options: FormatOptions;
  setOption: <K extends keyof FormatOptions>(
    key: K,
    value: FormatOptions[K]
  ) => void;
  groups: Set<string>;
  onDownload: () => void;
  onLoadSample: () => void;
  onClear: () => void;
  canDownload: boolean;
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
      <DropdownMenuContent align="end" className="w-56">
        {groups.has("indent") && (
          <DropdownMenuItem
            onSelect={() => setOption("useTabs", !options.useTabs)}
          >
            {options.useTabs ? "✓ " : ""}Use tabs
          </DropdownMenuItem>
        )}
        {groups.has("js") && (
          <>
            <DropdownMenuItem onSelect={() => setOption("semi", !options.semi)}>
              {options.semi ? "✓ " : ""}Semicolons
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setOption("singleQuote", !options.singleQuote)}
            >
              {options.singleQuote ? "✓ " : ""}Single quotes
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                setOption("bracketSpacing", !options.bracketSpacing)
              }
            >
              {options.bracketSpacing ? "✓ " : ""}Bracket spacing
            </DropdownMenuItem>
          </>
        )}
        {groups.has("css") && (
          <DropdownMenuItem
            onSelect={() => setOption("singleQuote", !options.singleQuote)}
          >
            {options.singleQuote ? "✓ " : ""}Single quotes
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDownload} disabled={!canDownload}>
          <Download size={13} aria-hidden />
          Download formatted
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
  lang,
  maxHighlight,
  bare,
}: {
  value: string;
  onChange: (v: string) => void;
  onPaste: () => void;
  onClear: () => void;
  lang: ReturnType<typeof toHighlighterLang>;
  maxHighlight: number;
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
          {value ? `${value.length.toLocaleString()} chars` : "paste source"}
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
          lang={lang}
          placeholder="Paste source code to format…"
          maxHighlightSize={maxHighlight}
          wrap
          // No onPasteFormatted — CodeView skips its JSON auto-format
          // path and the textarea handles paste natively.
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
  lang,
  maxHighlight,
  bare,
}: {
  output: string;
  outputHtml: string;
  error: string | null;
  errorLine: number | undefined;
  lang: ReturnType<typeof toHighlighterLang>;
  maxHighlight: number;
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
            lang={lang}
            maxHighlightSize={maxHighlight}
            wrap
          />
        </div>
      )}
    </div>
  );
}
