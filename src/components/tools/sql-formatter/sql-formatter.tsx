"use client";

import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/primitives/dropdown-menu";
import { FormatterDiff } from "@/components/tools/code-formatter/formatter-diff";
import {
  downloadText,
  FieldSelect,
  FormatterStatusBar,
  FormatterToolbar,
  FormatterWindow,
  InputEditor,
  InputPane,
  MenuHint,
  MoreMenu,
  OutputLines,
  OutputPane,
  PaneRow,
  pasteInto,
  SegGroup,
  type StatusTone,
} from "@/components/tools/code-formatter/formatter-window";
import { countLines, linesLabel } from "@/components/tools/code-formatter/split-lines.lib";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { seoData, SqlFormatterContent } from "./content";
import { COPY_AS_OPTIONS, DIALECTS, type CopyAsFormat, type SqlFormatOptions } from "./sql-formatter.lib";
import { useSqlFormatter } from "./use-sql-formatter";

type KeywordCase = NonNullable<SqlFormatOptions["keywordCase"]>;

const DIALECT_OPTIONS = DIALECTS.map((d) => ({ v: d.id, label: d.label }));

/**
 * SQL formatter (v2 "conv" workspace). Toolbar: dialect, keyword case,
 * indent; everything else — minify, diff, line width, comma/AND style,
 * copy-as, share, download — lives in the ⋯ menu.
 */
export function SqlFormatter({ tool }: { tool: Tool }) {
  const s = useSqlFormatter();
  const isMobile = useIsMobile();
  const workspaceRef = useRef<HTMLDivElement>(null);

  const hasInput = s.input.trim().length > 0;
  const output = s.error ? "" : s.output;
  const showDiff = s.view === "diff" && !isMobile && !!output;
  const kcase = s.options.keywordCase ?? "upper";
  const tab = s.options.tabWidth ?? 2;
  const width = s.options.expressionWidth ?? 50;
  const outLabel = s.mode === "minify" ? "Minified SQL" : "Formatted SQL";
  const outLines = countLines(output);

  // ── Actions ─────────────────────────────────────────────────────────
  const onCopyAs = useCallback(
    async (fmt: CopyAsFormat) => {
      if (await s.copyAs(fmt)) {
        toast.success(`Copied as ${COPY_AS_OPTIONS.find((o) => o.id === fmt)?.label ?? fmt}`);
      } else toast.error("Couldn't copy to clipboard");
    },
    [s],
  );

  const onShare = useCallback(async () => {
    if (await s.share()) {
      toast.success("Share link copied", { description: "Anyone with the link sees this query + dialect.", duration: 2400 });
    } else toast.error("Couldn't generate share link");
  }, [s]);

  const onDownload = useCallback(() => {
    if (!output) return;
    downloadText(output, "formatted.sql", "text/x-sql");
    toast.success("formatted.sql downloaded", { duration: 1600 });
  }, [output]);

  const onCopy = useCallback(async () => (output ? s.copyOutput() : false), [output, s]);

  // ── Shortcuts ───────────────────────────────────────────────────────
  useShortcut({ key: "/", ignoreInEditable: true, label: "Focus input" }, (e) => {
    e.preventDefault();
    workspaceRef.current?.querySelector("textarea")?.focus();
  });
  useShortcut({ key: "c", meta: true, shift: true, label: "Copy output" }, (e) => {
    e.preventDefault();
    void onCopy().then((ok) => {
      if (ok) toast.success(`Copied ${output.length.toLocaleString()} chars`);
    });
  });
  useShortcut({ key: "d", meta: true, shift: true, ignoreInEditable: true, label: "Toggle diff view" }, (e) => {
    e.preventDefault();
    s.setView(s.view === "diff" ? "output" : "diff");
  });

  // ── Status ──────────────────────────────────────────────────────────
  let tone: StatusTone = "ok";
  let inputStatus = "Looks good";
  if (!hasInput) {
    tone = "idle";
    inputStatus = "Waiting for input";
  } else if (s.error) {
    tone = "error";
    inputStatus = "Can't parse";
  } else if (s.pending) {
    tone = "pending";
    inputStatus = "Formatting…";
  }
  const errorText = s.error ? `Parse error${s.errorLine ? ` on line ${s.errorLine}` : ""}: ${s.error}` : null;
  const done = s.mode === "minify" ? "Minified" : "Formatted";
  const statusText = errorText ?? (tone === "ok" ? done : inputStatus);
  const stats = s.stats;
  const extra = output
    ? `${stats.statementCount} statement${stats.statementCount === 1 ? "" : "s"} · ${stats.inputChars.toLocaleString()}→${stats.outputChars.toLocaleString()} chars · ${s.elapsed} ms`
    : undefined;

  const toggleCase = (key: "identifierCase" | "functionCase" | "dataTypeCase") =>
    s.setOption(key, s.options[key] === "upper" ? "preserve" : "upper");

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div ref={workspaceRef}>
        <FormatterWindow onFile={s.acceptDroppedFile} dropTitle="Drop a .sql file" dropHint="The dialect is detected when it's obvious.">
          <FormatterToolbar>
            <FieldSelect label="Dialect" value={s.dialect} options={DIALECT_OPTIONS} onChange={s.setDialect} />
            <SegGroup<KeywordCase>
              label="Keyword case"
              options={[
                { v: "upper", label: "UPPER" },
                { v: "lower", label: "lower" },
              ]}
              value={kcase === "preserve" ? null : kcase}
              onChange={(v) => s.setOption("keywordCase", v)}
            />
            <SegGroup<number>
              label="Indent"
              options={[
                { v: 2, label: "2 sp" },
                { v: 4, label: "4 sp" },
              ]}
              value={tab === 2 || tab === 4 ? tab : null}
              onChange={(v) => s.setOption("tabWidth", v)}
            />
            <MoreMenu>
              <DropdownMenuLabel>Output</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={s.mode === "minify"} onCheckedChange={(on) => s.setMode(on ? "minify" : "format")}>
                Minify to one line
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={s.view === "diff"}
                disabled={isMobile || !output}
                onCheckedChange={(on) => s.setView(on ? "diff" : "output")}
              >
                Compare with input
                <MenuHint>⌘⇧D</MenuHint>
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Case</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={kcase === "preserve"}
                onCheckedChange={(on) => s.setOption("keywordCase", on ? "preserve" : "upper")}
              >
                Keep keyword case as written
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={s.options.identifierCase === "upper"} onCheckedChange={() => toggleCase("identifierCase")}>
                Uppercase identifiers
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={s.options.functionCase === "upper"} onCheckedChange={() => toggleCase("functionCase")}>
                Uppercase functions
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={s.options.dataTypeCase === "upper"} onCheckedChange={() => toggleCase("dataTypeCase")}>
                Uppercase data types
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Layout</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={tab === 8} onCheckedChange={(on) => s.setOption("tabWidth", on ? 8 : 2)}>
                Indent 8 spaces
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={!!s.options.useTabs} onCheckedChange={(on) => s.setOption("useTabs", on)}>
                Indent with tabs
              </DropdownMenuCheckboxItem>
              {[50, 80, 120].map((w) => (
                <DropdownMenuCheckboxItem key={w} checked={width === w} onCheckedChange={() => s.setOption("expressionWidth", w)}>
                  Line width {w}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuCheckboxItem
                checked={s.options.logicalOperatorNewline === "before"}
                onCheckedChange={(on) => s.setOption("logicalOperatorNewline", on ? "before" : "after")}
              >
                AND / OR start the line
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={!!s.options.leadingComma} onCheckedChange={(on) => s.setOption("leadingComma", on)}>
                Leading commas
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={!!s.options.newlineBeforeSemicolon}
                onCheckedChange={(on) => s.setOption("newlineBeforeSemicolon", on)}
              >
                Newline before ;
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Copy as</DropdownMenuLabel>
              {COPY_AS_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.id} disabled={!output} onSelect={() => void onCopyAs(o.id)}>
                  {o.label}
                  <MenuHint>{o.hint}</MenuHint>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!hasInput} onSelect={() => void onShare()}>
                Copy share link
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!output} onSelect={onDownload}>
                Download .sql
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void pasteInto(s.setInput)}>Paste from clipboard</DropdownMenuItem>
              <DropdownMenuItem onSelect={s.loadSample}>Load sample</DropdownMenuItem>
              <DropdownMenuItem disabled={!s.input} onSelect={s.clear}>
                Clear input
              </DropdownMenuItem>
            </MoreMenu>
          </FormatterToolbar>

          <PaneRow>
            <InputPane label="SQL" status={inputStatus} tone={tone}>
              <InputEditor
                value={s.input}
                onChange={s.setInput}
                lang="sql"
                ariaLabel="SQL input"
                placeholder="Paste any SQL — a one-liner from your logs, a migration, several statements…"
              />
            </InputPane>
            <OutputPane
              label={showDiff ? "Input → output" : outLabel}
              summary={output ? linesLabel(outLines) : undefined}
              onCopy={onCopy}
              canCopy={!!output}
              error={errorText}
            >
              {showDiff ? (
                <FormatterDiff before={s.input} after={output} />
              ) : (
                <OutputLines text={output} lang="sql" placeholder={s.error ? "Fix the SQL on the left to see output." : undefined} />
              )}
            </OutputPane>
          </PaneRow>

          <FormatterStatusBar tone={tone} text={statusText} detail={output ? `${outLabel} · ${linesLabel(outLines)}` : undefined} extra={extra} />
        </FormatterWindow>
      </div>

      <SqlFormatterContent />
    </ToolShell>
  );
}
