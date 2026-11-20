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
import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { seoData, XmlFormatterContent } from "./content";
import { useXmlFormatter } from "./use-xml-formatter";
import { applyFlavor, FLAVORS, type DeclarationMode, type Flavor } from "./xml-formatter.lib";

const FLAVOR_OPTIONS = FLAVORS.map((f) => ({ v: f.id, label: f.label }));
const DECLARATIONS: ReadonlyArray<{ v: DeclarationMode; label: string }> = [
  { v: "preserve", label: "Keep the declaration" },
  { v: "strip", label: "Strip the declaration" },
  { v: "add", label: "Add one if missing" },
];

/**
 * XML formatter (v2 "conv" workspace). Toolbar: flavor, Format / Minify,
 * indent; JSON conversion, diff, format options, share and download live
 * in the ⋯ menu.
 */
export function XmlFormatter({ tool }: { tool: Tool }) {
  const s = useXmlFormatter();
  const isMobile = useIsMobile();
  const workspaceRef = useRef<HTMLDivElement>(null);

  const hasInput = s.input.trim().length > 0;
  const output = s.error ? "" : s.output;
  const isJson = s.mode === "json";
  const formatActive = s.mode === "format";
  const showDiff = s.view === "diff" && !isMobile && !!output;
  // The flavor preset fills any indent the user hasn't set (POM = 4 spaces).
  const eff = useMemo(() => applyFlavor(s.options, s.effectiveFlavor), [s.options, s.effectiveFlavor]);
  const indent = eff.indent ?? 2;
  const outLabel = isJson ? "JSON" : s.mode === "minify" ? "Minified XML" : "Formatted XML";
  const outLines = countLines(output);
  const ext = isJson ? "json" : "xml";

  const onShare = useCallback(async () => {
    if (await s.share()) toast.success("Share link copied", { duration: 2400 });
    else toast.error("Couldn't generate share link");
  }, [s]);

  const onDownload = useCallback(() => {
    if (!output) return;
    downloadText(output, `formatted.${ext}`, isJson ? "application/json" : "application/xml");
    toast.success(`formatted.${ext} downloaded`, { duration: 1600 });
  }, [output, ext, isJson]);

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
  useShortcut({ key: "m", meta: true, shift: true, ignoreInEditable: true, label: "Toggle minify" }, (e) => {
    e.preventDefault();
    s.setMode(s.mode === "minify" ? "format" : "minify");
  });
  useShortcut({ key: "j", meta: true, shift: true, ignoreInEditable: true, label: "Toggle JSON output" }, (e) => {
    e.preventDefault();
    s.setMode(isJson ? "format" : "json");
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
  const errorText = s.error ? `${s.errorLine ? `Line ${s.errorLine}: ` : ""}${s.error}` : null;
  const done = isJson ? "Converted" : s.mode === "minify" ? "Minified" : "Formatted";
  const statusText = errorText ?? (tone === "ok" ? done : inputStatus);
  const st = s.stats;
  const extra = output
    ? [
        `${st.elementCount} element${st.elementCount === 1 ? "" : "s"}`,
        `${st.attributeCount} attr${st.attributeCount === 1 ? "" : "s"}`,
        `depth ${st.maxDepth}`,
        st.commentCount > 0 ? `${st.commentCount} comment${st.commentCount === 1 ? "" : "s"}` : "",
        `${s.elapsed} ms`,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div ref={workspaceRef}>
        <FormatterWindow onFile={s.acceptDroppedFile} dropTitle="Drop an XML file" dropHint="The flavor is detected from the root element.">
          <FormatterToolbar>
            <FieldSelect<Flavor>
              label="Flavor"
              value={s.flavor}
              options={FLAVOR_OPTIONS}
              onChange={s.setFlavor}
              suffix={s.flavor === "auto" ? `→ ${s.effectiveFlavor}` : undefined}
            />
            <SegGroup<"format" | "minify">
              label="Mode"
              options={[
                { v: "format", label: "Format" },
                { v: "minify", label: "Minify" },
              ]}
              value={isJson ? null : s.mode === "minify" ? "minify" : "format"}
              onChange={s.setMode}
            />
            <SegGroup<number>
              label="Indent"
              options={[
                { v: 2, label: "2 sp" },
                { v: 4, label: "4 sp" },
              ]}
              value={indent === 2 || indent === 4 ? indent : null}
              onChange={(v) => s.setOption("indent", v)}
            />
            <MoreMenu>
              <DropdownMenuLabel>Output</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={isJson} onCheckedChange={(on) => s.setMode(on ? "json" : "format")}>
                Convert to JSON
                <MenuHint>⌘⇧J</MenuHint>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={s.view === "diff"}
                disabled={isMobile || !output}
                onCheckedChange={(on) => s.setView(on ? "diff" : "output")}
              >
                Compare with input
                <MenuHint>⌘⇧D</MenuHint>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={indent === "tab"} onCheckedChange={(on) => s.setOption("indent", on ? "tab" : 2)}>
                Indent with tabs
              </DropdownMenuCheckboxItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Format options</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                disabled={!formatActive}
                checked={eff.selfClosing === "expand"}
                onCheckedChange={(on) => s.setOption("selfClosing", on ? "expand" : "compact")}
              >
                Expand {"<a/>"} to {"<a></a>"}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                disabled={!formatActive}
                checked={!!eff.keepComments}
                onCheckedChange={(on) => s.setOption("keepComments", on)}
              >
                Keep comments
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                disabled={!formatActive}
                checked={!!eff.sortAttributes}
                onCheckedChange={(on) => s.setOption("sortAttributes", on)}
              >
                Sort attributes
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                disabled={!formatActive}
                checked={!!eff.stripNamespaces}
                onCheckedChange={(on) => s.setOption("stripNamespaces", on)}
              >
                Strip xmlns
              </DropdownMenuCheckboxItem>
              {DECLARATIONS.map((d) => (
                <DropdownMenuCheckboxItem
                  key={d.v}
                  disabled={!formatActive}
                  checked={(eff.declaration ?? "preserve") === d.v}
                  onCheckedChange={() => s.setOption("declaration", d.v)}
                >
                  {d.label}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!hasInput} onSelect={() => void onShare()}>
                Copy share link
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!output} onSelect={onDownload}>
                Download .{ext}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void pasteInto(s.setInput)}>Paste from clipboard</DropdownMenuItem>
              <DropdownMenuItem onSelect={s.loadSample}>Load sample</DropdownMenuItem>
              <DropdownMenuItem disabled={!s.input} onSelect={s.clear}>
                Clear input
              </DropdownMenuItem>
            </MoreMenu>
          </FormatterToolbar>

          <PaneRow>
            <InputPane label="XML" status={inputStatus} tone={tone}>
              <InputEditor
                value={s.input}
                onChange={s.setInput}
                lang="xml"
                ariaLabel="XML input"
                placeholder="Paste any XML — SOAP envelope, RSS feed, SVG, Maven POM, Android layout…"
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
                <OutputLines text={output} lang={isJson ? "json" : "xml"} placeholder={s.error ? "Fix the XML on the left to see output." : undefined} />
              )}
            </OutputPane>
          </PaneRow>

          <FormatterStatusBar tone={tone} text={statusText} detail={output ? `${outLabel} · ${linesLabel(outLines)}` : undefined} extra={extra} />
        </FormatterWindow>
      </div>

      <XmlFormatterContent />
    </ToolShell>
  );
}
