"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";
import { Input } from "@/components/primitives/Input";
import { Textarea } from "@/components/primitives/Textarea";
import { Button } from "@/components/primitives/Button";
import { Badge } from "@/components/primitives/Badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/primitives/ToggleGroup";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/primitives/Accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/DropdownMenu";
import { ToolShell } from "@/components/layout/ToolShell";
import {
  compile,
  matchAll,
  ALL_FLAGS,
  flagDescriptions,
  commonPatterns,
  type Flag,
} from "./regex.lib";
import type { Tool } from "@/lib/tools-registry";

const SAMPLE_TEXT = `Reach the team at hello@devtoolbox.dev or support@devtoolbox.dev.
Visit https://devtoolbox.dev for the docs and https://example.com for tests.
Server is at 192.168.1.42 — branding accent #D4FF4F. Released 2026-05-04.`;

export function RegexTester({ tool }: { tool: Tool }) {
  const [pattern, setPattern] = useState("\\b[\\w.-]+@[\\w.-]+\\.[a-z]{2,}\\b");
  const [flags, setFlags] = useState<string[]>(["g", "i"]);
  const [text, setText] = useState(SAMPLE_TEXT);

  // Defer compile + matchAll so a slow regex (or a long test string) never
  // blocks keystrokes. Slice the highlight overlay from the same deferred
  // string so match indices and rendered text stay in sync.
  const deferredPattern = useDeferredValue(pattern);
  const deferredText = useDeferredValue(text);
  const flagsKey = flags.join("");
  const compiled = useMemo(() => compile(deferredPattern, flagsKey), [deferredPattern, flagsKey]);
  const matches = useMemo(
    () => (compiled.ok ? matchAll(compiled.regex, deferredText) : []),
    [compiled, deferredText],
  );

  const highlighted = useMemo(() => {
    if (!matches.length) return null;
    const out: React.ReactNode[] = [];
    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.index > cursor) out.push(deferredText.slice(cursor, m.index));
      out.push(
        <mark key={`${m.index}-${i}`} className={i % 2 === 0 ? "regex-match" : "regex-match-alt"}>
          {deferredText.slice(m.index, m.end) || "·"}
        </mark>,
      );
      cursor = m.end;
    });
    if (cursor < deferredText.length) out.push(deferredText.slice(cursor));
    return out;
  }, [matches, deferredText]);

  return (
    <ToolShell
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={() => setText(SAMPLE_TEXT)}>
            Reset sample
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setPattern("");
              setText("");
            }}
          >
            Clear all
          </Button>
          <span className="ml-auto flex items-center gap-2 text-xs text-text-muted">
            Matches
            <AnimatePresence mode="popLayout">
              <motion.span
                key={matches.length}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0.4 }}
              >
                <Badge variant={matches.length ? "brand" : "neutral"}>{matches.length}</Badge>
              </motion.span>
            </AnimatePresence>
          </span>
        </>
      }
    >
      <div className="rounded-xl border border-border-subtle bg-surface p-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-text-faint">/</span>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="enter pattern…"
            className="flex-1 min-w-50 font-mono"
            aria-label="Regex pattern"
          />
          <span className="font-mono text-sm text-text-faint">/</span>
          <ToggleGroup
            type="multiple"
            value={flags}
            onValueChange={(v: string[]) => setFlags(v)}
            aria-label="Regex flags"
          >
            {ALL_FLAGS.map((f) => (
              <ToggleGroupItem key={f} value={f} aria-label={flagDescriptions[f as Flag]}>
                {f}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <BookOpen size={12} />
                Patterns
                <ChevronDown size={11} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-65">
              <DropdownMenuLabel>Common patterns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {commonPatterns.map((p) => (
                <DropdownMenuItem
                  key={p.label}
                  onSelect={() => {
                    setPattern(p.pattern);
                    setFlags(p.flags.split(""));
                  }}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="text-text">{p.label}</span>
                  <span className="text-xs text-text-faint">{p.hint}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!compiled.ok && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger">
            {compiled.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 h-9 border-b border-border-subtle">
            <span className="text-xs uppercase tracking-wider text-text-faint">Test string</span>
            <span className="text-xs text-text-faint font-mono">{text.length} chars</span>
          </div>
          <div className="relative flex-1 min-h-75">
            <pre
              aria-hidden
              className="absolute inset-0 m-0 px-3.5 py-3 font-mono text-xs-plus leading-code text-transparent whitespace-pre-wrap break-words pointer-events-none"
            >
              {highlighted ?? text}
            </pre>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="absolute inset-0 border-0 bg-transparent text-text caret-text whitespace-pre-wrap"
              placeholder="Type test text here…"
            />
            <pre
              aria-hidden
              className="absolute inset-0 m-0 px-3.5 py-3 font-mono text-xs-plus leading-code text-text whitespace-pre-wrap break-words pointer-events-none"
              style={{ visibility: matches.length ? "visible" : "hidden" }}
            >
              {highlighted}
            </pre>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 h-9 border-b border-border-subtle">
            <span className="text-xs uppercase tracking-wider text-text-faint">
              {matches.length} match{matches.length === 1 ? "" : "es"}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            {matches.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-faint">
                No matches yet — adjust the pattern or test string.
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={["m-0"]}>
                {matches.slice(0, 200).map((m, i) => (
                  <AccordionItem key={`m-${i}`} value={`m-${i}`}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="neutral">#{i + 1}</Badge>
                        <code className="font-mono text-xs text-text truncate">
                          {m.match || "(empty)"}
                        </code>
                        <span className="ml-auto text-2xs text-text-faint font-mono">
                          {m.index}–{m.end}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1.5 font-mono text-xs">
                        {m.groups.length === 0 ? (
                          <p className="text-text-faint">No capture groups.</p>
                        ) : (
                          m.groups.map((g, j) => (
                            <div key={j} className="flex items-baseline gap-2">
                              <Badge variant="neutral">${j + 1}</Badge>
                              <code className="text-text break-all">{g || "(empty)"}</code>
                            </div>
                          ))
                        )}
                        {Object.keys(m.named).length > 0 && (
                          <>
                            <div className="pt-1 text-2xs uppercase tracking-wider text-text-faint">
                              Named
                            </div>
                            {Object.entries(m.named).map(([k, v]) => (
                              <div key={k} className="flex items-baseline gap-2">
                                <Badge variant="brand">{k}</Badge>
                                <code className="text-text break-all">{v}</code>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
