"use client";

import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { ChevronDown } from "lucide-react";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { getLanguage, LANGUAGES, toHighlighterLang, type LanguageId } from "./code-formatter.lib";
import { CodeFormatterContent, seoData } from "./content";
import {
  downloadText,
  FormatterStatusBar,
  FormatterToolbar,
  FormatterWindow,
  InputEditor,
  InputPane,
  MoreMenu,
  OutputLines,
  OutputPane,
  PaneRow,
  pasteInto,
  SegButton,
  SegGroup,
  type StatusTone,
} from "./formatter-window";
import { countLines, linesLabel } from "./split-lines.lib";
import { useCodeFormatter } from "./use-code-formatter";

/** The three languages the mockup puts on the toolbar; the rest sit under "More". */
const PRIMARY: ReadonlyArray<{ v: LanguageId; label: string }> = [
  { v: "javascript", label: "JavaScript" },
  { v: "css", label: "CSS" },
  { v: "html", label: "HTML" },
];
const PRIMARY_IDS = new Set<LanguageId>(PRIMARY.map((p) => p.v));
const OTHER_LANGUAGES = LANGUAGES.filter((l) => !PRIMARY_IDS.has(l.id));

/**
 * Code formatter (v2 "conv" workspace). Prettier runs in the browser with
 * per-language parser chunks; debounced auto-format, no Format button.
 * Parse errors show verbatim, with Prettier's line number.
 */
export function CodeFormatter({ tool }: { tool: Tool }) {
  const s = useCodeFormatter();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const lang = getLanguage(s.language);
  const groups = new Set(lang.optionGroups);
  const hLang = toHighlighterLang(s.language);
  const hasInput = s.input.trim().length > 0;
  const output = s.error ? "" : s.output;
  const outLines = countLines(output);
  const tab = s.options.tabWidth ?? 2;
  const width = s.options.printWidth ?? 80;
  const trailing = s.options.trailingComma ?? "all";
  const isOther = !PRIMARY_IDS.has(s.language);

  const onCopy = useCallback(async () => {
    if (!output) return false;
    try {
      await navigator.clipboard.writeText(output);
      return true;
    } catch {
      return false;
    }
  }, [output]);

  const onDownload = useCallback(() => {
    if (!output) return;
    downloadText(output, `formatted.${lang.extension}`, "text/plain");
    toast.success(`formatted.${lang.extension} downloaded`, { duration: 1600 });
  }, [output, lang.extension]);

  const onFile = useCallback(
    async (file: File) => {
      s.replaceInput(await file.text());
    },
    [s],
  );

  // ── Shortcuts ───────────────────────────────────────────────────────
  useShortcut({ key: "/", ignoreInEditable: true, label: "Focus input" }, (e) => {
    e.preventDefault();
    workspaceRef.current?.querySelector<HTMLElement>(".cm-content")?.focus();
  });
  useShortcut({ key: "c", meta: true, shift: true, label: "Copy output" }, (e) => {
    e.preventDefault();
    void onCopy().then((ok) => {
      if (ok) toast.success(`Copied ${output.length.toLocaleString()} chars`);
      else toast("Nothing to copy yet", { duration: 1000 });
    });
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
  const errorText = s.error ? `${s.errorLine ? `Line ${s.errorLine}: ` : ""}${s.error}` : null;
  const statusText = errorText ?? (tone === "ok" ? "Formatted" : inputStatus);
  const st = s.stats;
  const delta = st.delta === 0 ? "" : ` (${st.delta > 0 ? "+" : ""}${st.delta.toLocaleString()})`;
  const extra = output
    ? `${st.inputLines}→${st.outputLines} lines · ${st.inputChars.toLocaleString()}→${st.outputChars.toLocaleString()} chars${delta} · ${s.elapsed} ms`
    : undefined;

  const moreLanguages = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SegButton on={isOther} aria-label="More languages">
          {isOther ? lang.label : "More"}
          <ChevronDown size={13} aria-hidden />
        </SegButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(70vh,520px)] w-48 overflow-y-auto">
        {OTHER_LANGUAGES.map((l) => (
          <DropdownMenuCheckboxItem key={l.id} checked={l.id === s.language} onCheckedChange={() => s.setLanguage(l.id)}>
            {l.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div ref={workspaceRef}>
        <FormatterWindow onFile={onFile} dropTitle="Drop a source file" dropHint="Pick its language on the toolbar.">
          <FormatterToolbar>
            <SegGroup<LanguageId>
              label="Language"
              options={PRIMARY}
              value={isOther ? null : s.language}
              onChange={s.setLanguage}
              trailing={moreLanguages}
            />
            {groups.has("indent") && (
              <SegGroup<number>
                label="Indent"
                options={[
                  { v: 2, label: "2 sp" },
                  { v: 4, label: "4 sp" },
                ]}
                value={tab === 2 || tab === 4 ? tab : null}
                onChange={(v) => s.setOption("tabWidth", v)}
              />
            )}
            <MoreMenu>
              {groups.has("indent") && (
                <>
                  <DropdownMenuLabel>Indent</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={tab === 8} onCheckedChange={(on) => s.setOption("tabWidth", on ? 8 : 2)}>
                    Indent 8 spaces
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={!!s.options.useTabs} onCheckedChange={(on) => s.setOption("useTabs", on)}>
                    Indent with tabs
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {groups.has("width") && (
                <>
                  <DropdownMenuLabel>Line width</DropdownMenuLabel>
                  {[80, 100, 120].map((w) => (
                    <DropdownMenuCheckboxItem key={w} checked={width === w} onCheckedChange={() => s.setOption("printWidth", w)}>
                      {w} columns
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              {groups.has("js") && (
                <>
                  <DropdownMenuLabel>JavaScript</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={!!s.options.semi} onCheckedChange={(on) => s.setOption("semi", on)}>
                    Semicolons
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={!!s.options.singleQuote} onCheckedChange={(on) => s.setOption("singleQuote", on)}>
                    Single quotes
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={!!s.options.bracketSpacing} onCheckedChange={(on) => s.setOption("bracketSpacing", on)}>
                    Bracket spacing
                  </DropdownMenuCheckboxItem>
                  {(["all", "es5", "none"] as const).map((t) => (
                    <DropdownMenuCheckboxItem key={t} checked={trailing === t} onCheckedChange={() => s.setOption("trailingComma", t)}>
                      Trailing commas: {t}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              {groups.has("css") && (
                <>
                  <DropdownMenuCheckboxItem checked={!!s.options.singleQuote} onCheckedChange={(on) => s.setOption("singleQuote", on)}>
                    Single quotes
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem disabled={!output} onSelect={onDownload}>
                Download .{lang.extension}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void pasteInto(s.replaceInput)}>Paste from clipboard</DropdownMenuItem>
              <DropdownMenuItem onSelect={s.loadSample}>Load sample</DropdownMenuItem>
              <DropdownMenuItem disabled={!s.input} onSelect={s.clear}>
                Clear input
              </DropdownMenuItem>
            </MoreMenu>
          </FormatterToolbar>

          <PaneRow>
            <InputPane label={lang.label} status={inputStatus} tone={tone}>
              <InputEditor
                value={s.input}
                onChange={s.setInput}
                lang={hLang}
                errorLine={s.error ? s.errorLine : undefined}
                ariaLabel={`${lang.label} input`}
                placeholder={`Paste ${lang.label} to format…`}
              />
            </InputPane>
            <OutputPane label={lang.label} summary={output ? linesLabel(outLines) : undefined} onCopy={onCopy} canCopy={!!output} error={errorText}>
              <OutputLines text={output} lang={hLang} placeholder={s.error ? `Fix the ${lang.label} on the left to see output.` : undefined} />
            </OutputPane>
          </PaneRow>

          <FormatterStatusBar tone={tone} text={statusText} detail={output ? `${lang.label} · ${linesLabel(outLines)}` : undefined} extra={extra} />
        </FormatterWindow>
      </div>

      <CodeFormatterContent />
    </ToolShell>
  );
}
