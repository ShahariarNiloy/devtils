"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/primitives/Button";
import { Switch } from "@/components/primitives/Switch";
import { Kbd } from "@/components/primitives/Kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/Select";
import { ToolShell } from "@/components/layout/ToolShell";
import { useShortcut } from "@/lib/keyboard";
import {
  formatJSON,
  minifyJSON,
  analyzeJSON,
  formatBytes,
  type IndentMode,
} from "./json-formatter.lib";
import { highlightJSON, lineCount } from "./json-highlighter";
import type { Tool } from "@/lib/tools-registry";

const SAMPLE = `{"name":"DevToolbox","version":"1.0.0","tools":["json","text","base64","regex","color"],"open":true,"meta":{"author":null,"count":5}}`;

export function JsonFormatter({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<IndentMode>("2");
  const [minify, setMinify] = useState(false);
  const [error, setError] = useState<{
    message: string;
    line?: number;
    column?: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Defer the heavy passes (full JSON.parse + tokenizer) so typing stays snappy
  // even when the input is large; React renders these at low priority.
  const deferredInput = useDeferredValue(input);
  const deferredOutput = useDeferredValue(output);
  const stats = useMemo(() => analyzeJSON(deferredInput), [deferredInput]);
  const inputLines = useMemo(() => lineCount(deferredInput), [deferredInput]);
  const outputHighlighted = useMemo(() => highlightJSON(deferredOutput), [deferredOutput]);

  const run = (mode: "format" | "minify") => {
    const result = mode === "minify" ? minifyJSON(input) : formatJSON(input, indent);
    if (result.ok) {
      setOutput(result.output);
      setError(null);
    } else {
      setError({ message: result.message, line: result.line, column: result.column });
    }
  };

  useShortcut({ key: "Enter", meta: true }, (e) => {
    e.preventDefault();
    run(minify ? "minify" : "format");
  });
  useShortcut({ key: "m", meta: true, shift: true }, (e) => {
    e.preventDefault();
    setMinify(true);
    run("minify");
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run(minify ? "minify" : "format");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indent, minify]);

  const onCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied formatted JSON");
    setTimeout(() => setCopied(false), 1400);
  };

  const onScrollInput = () => {
    if (gutterRef.current && inputRef.current) {
      gutterRef.current.scrollTop = inputRef.current.scrollTop;
    }
  };

  return (
    <ToolShell
      tool={tool}
      actions={
        <>
          <Button variant="primary" size="md" onClick={() => run("format")}>
            Format
            <Kbd className="!bg-charcoal/15 !border-charcoal/20 !text-charcoal">⌘ ↵</Kbd>
          </Button>
          <Button variant="secondary" size="md" onClick={() => run("minify")}>
            Minify
            <Kbd>⌘ ⇧ M</Kbd>
          </Button>
          <Button variant="ghost" size="md" onClick={() => setInput("")}>
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs text-text-muted">
            {stats ? (
              <>
                <span>{stats.keys} keys</span>
                <span className="text-text-faint">·</span>
                <span>depth {stats.depth}</span>
                <span className="text-text-faint">·</span>
                <span>{formatBytes(stats.bytes)}</span>
              </>
            ) : (
              <span className="text-danger">invalid JSON</span>
            )}
          </div>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-surface px-3 py-2.5">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Indent
          <Select value={indent} onValueChange={(v) => setIndent(v as IndentMode)}>
            <SelectTrigger size="sm" className="min-w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 spaces</SelectItem>
              <SelectItem value="4">4 spaces</SelectItem>
              <SelectItem value="tab">Tab</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <Switch checked={minify} onCheckedChange={setMinify} />
          Minified output
        </label>
        <button
          type="button"
          onClick={() => setInput(SAMPLE)}
          className="ml-auto text-xs text-text-faint hover:text-text-muted transition-colors"
        >
          Load sample
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs-plus text-danger">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <span>{error.message}</span>
            {error.line ? (
              <span className="ml-2 text-danger/80">
                line {error.line}, column {error.column}
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 h-9 border-b border-border-subtle">
            <span className="text-xs uppercase tracking-wider text-text-faint">Input</span>
            <span className="text-xs text-text-faint font-mono">{inputLines} lines</span>
          </div>
          <div className="relative flex h-115">
            <div
              ref={gutterRef}
              aria-hidden
              className="select-none overflow-hidden bg-surface-soft border-r border-border-subtle py-3 px-2 text-right font-mono text-xs leading-code text-text-faint min-w-line-num"
            >
              {Array.from({ length: inputLines }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onScroll={onScrollInput}
              spellCheck={false}
              placeholder="Paste JSON here…"
              className="flex-1 resize-none bg-transparent px-3 py-3 font-mono text-xs-plus leading-code text-text placeholder:text-text-faint outline-none border-0"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 h-9 border-b border-border-subtle">
            <span className="text-xs uppercase tracking-wider text-text-faint">Output</span>
            <button
              type="button"
              onClick={onCopy}
              disabled={!output}
              aria-label="Copy output"
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text disabled:text-text-faint disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check size={12} className="text-brand" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="flex-1 overflow-auto px-3 py-3 font-mono text-xs-plus leading-code text-text">
            {output ? (
              <code dangerouslySetInnerHTML={{ __html: outputHighlighted }} />
            ) : (
              <span className="text-text-faint">Output will appear here.</span>
            )}
          </pre>
        </div>
      </div>
    </ToolShell>
  );
}
