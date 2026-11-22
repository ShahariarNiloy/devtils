"use client";

import { Copy, Link2, ListOrdered, MoreHorizontal, Quote } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { CronParserContent, seoData } from "./content";
import { describeCron, formatRun, nextRuns, parseCron, PRESETS, relativeTime, summarizeFields } from "./cron-parser.lib";

const DEFAULT_EXPR = "30 9 * * 1-5";
const URL_KEY = "cron";

/*
 * Clock as an external store, in 30 s buckets aligned to :00/:30 — the bucket
 * is always inside the current minute, which is all next-run maths needs.
 * The server snapshot is null, so nothing clock-dependent is prerendered.
 */
const TICK_MS = 30_000;
const clockSnapshot = () => Math.floor(Date.now() / TICK_MS);
function subscribeClock(onChange: () => void) {
  const id = setInterval(onChange, 5_000);
  return () => clearInterval(id);
}

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${what}`);
  } catch {
    toast.error("Couldn't copy — your browser blocked clipboard access");
  }
}

export function CronParser({ tool }: { tool: Tool }) {
  const [expr, setExpr] = useState(DEFAULT_EXPR);
  // Next runs depend on the clock, so they're computed only after mount (no SSR mismatch).
  const tick = useSyncExternalStore(subscribeClock, clockSnapshot, () => null);
  const now = useMemo(() => (tick === null ? null : new Date(tick * TICK_MS)), [tick]);
  const [runCount, setRunCount] = useState(5);

  // URL → state once, on the frame after mount.
  const [urlRead, setUrlRead] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const fromUrl = new URLSearchParams(window.location.search).get(URL_KEY);
      if (fromUrl) setExpr(fromUrl);
      setUrlRead(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // State → URL (shareable, no history spam).
  useEffect(() => {
    if (!urlRead) return;
    const url = new URL(window.location.href);
    if (expr.trim() && expr.trim() !== DEFAULT_EXPR) url.searchParams.set(URL_KEY, expr.trim());
    else url.searchParams.delete(URL_KEY);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [expr, urlRead]);

  const result = useMemo(() => parseCron(expr), [expr]);
  const cron = result.ok ? result.cron : null;
  const desc = useMemo(() => (cron ? describeCron(cron) : "—"), [cron]);
  const fields = useMemo(() => (cron ? summarizeFields(cron) : []), [cron]);
  const runs = useMemo(() => (cron && now ? nextRuns(cron, now, runCount) : []), [cron, now, runCount]);
  const tz = useMemo(() => (now ? Intl.DateTimeFormat().resolvedOptions().timeZone : ""), [now]);
  const trimmed = expr.trim();

  let nextDetail = "";
  if (now) nextDetail = runs.length ? `next run ${relativeTime(runs[0], now)}` : "no runs in the next 8 years";
  const status = !result.ok
    ? { tone: "text-error", text: "Invalid expression", detail: "" }
    : {
        tone: "text-success",
        text: "Valid",
        detail: nextDetail,
      };

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        {/* Expression + presets */}
        <div className="flex flex-col gap-2.5 border-b border-border-subtle bg-toolbar p-3.5">
          <div
            className={cn(
              "flex min-h-14 items-center gap-2.5 rounded-xl border bg-[#0d0d0c] pr-1.5 pl-3.5 focus-within:border-[rgba(224,160,114,0.5)]",
              result.ok ? "border-white/10" : "border-error-border",
            )}
          >
            <label htmlFor="cron-expr" className="sr-only">
              Cron expression
            </label>
            <input
              id="cron-expr"
              type="text"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-invalid={!result.ok}
              aria-describedby={!result.ok ? "cron-error" : undefined}
              placeholder="30 9 * * 1-5"
              className="min-w-0 grow bg-transparent font-mono text-[22px] tracking-[0.06em] text-clay-cream outline-none placeholder:text-placeholder"
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More actions"
                className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-text-tertiary hover:bg-white/[0.06] hover:text-text"
              >
                <MoreHorizontal size={18} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuItem disabled={!trimmed} onSelect={() => void copyText(trimmed, "expression")}>
                  <Copy size={14} /> Copy expression
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!cron} onSelect={() => void copyText(desc, "description")}>
                  <Quote size={14} /> Copy plain-English description
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void copyText(window.location.href, "link")}>
                  <Link2 size={14} /> Copy share link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setRunCount((n) => (n === 5 ? 20 : 5))}>
                  <ListOrdered size={14} /> {runCount === 5 ? "Show next 20 runs" : "Show next 5 runs"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
            {PRESETS.map((p) => {
              const on = p.expr === trimmed;
              return (
                <button
                  key={p.expr}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setExpr(p.expr)}
                  className={cn(
                    "min-h-9 cursor-pointer rounded-full border px-3 text-xs font-semibold transition-colors",
                    on
                      ? "border-[rgba(224,160,114,0.55)] bg-[rgba(224,160,114,0.14)] text-clay-cream"
                      : "border-white/10 text-text-muted hover:border-white/[0.18] hover:text-text",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {!result.ok && (
          <div id="cron-error" role="alert" className="border-b border-error-border bg-error-bg px-4 py-2.5 text-[13px] text-error-text">
            {result.error}
          </div>
        )}

        <div className="flex min-h-[400px] flex-wrap">
          <div className="flex min-w-0 flex-[1.3_1_360px] flex-col gap-4 border-b border-border-subtle p-[18px] sm:border-r sm:border-b-0">
            <div className="text-[22px] leading-[1.25] font-bold tracking-[-0.02em] sm:text-[28px]" aria-live="polite">
              {desc}
            </div>
            {fields.length > 0 && (
              <div className="grid grid-cols-5 gap-1.5">
                {fields.map((f) => (
                  <div key={f.key} className="surface-panel flex min-w-0 flex-col items-center gap-1 rounded-[10px] px-1.5 py-2.5 text-center">
                    <span className="font-mono text-base break-all text-clay-cream">{f.value}</span>
                    <span className="text-[10.5px] font-bold text-text-faint">{f.key}</span>
                    <span className="text-[11px] break-words text-text-muted">{f.detail}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs leading-[1.6] text-text-faint">
              Syntax: <span className="font-mono text-text-muted">*</span> any · <span className="font-mono text-text-muted">,</span> list ·{" "}
              <span className="font-mono text-text-muted">-</span> range · <span className="font-mono text-text-muted">/</span> step
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2 p-3.5">
            <div className="text-xs text-text-faint" title={tz || undefined}>
              Next runs · your time zone{tz ? ` (${tz})` : ""}
            </div>
            {runs.map((d, i) => (
              <div key={d.getTime()} className="surface-panel flex items-center gap-2.5 rounded-[11px] px-3 py-2.5">
                <span className="w-5 font-mono text-[11px] text-text-ghost">{i + 1}</span>
                <span className="grow font-mono text-[13px] text-text">{formatRun(d, now)}</span>
                <span className="text-xs text-text-faint">{now ? relativeTime(d, now) : ""}</span>
              </div>
            ))}
            {cron && now && runs.length === 0 && (
              <div className="surface-panel rounded-[11px] px-3 py-2.5 text-[13px] text-text-muted">
                This schedule never fires in the next 8 years — check the day and month (for example, 31 Feb).
              </div>
            )}
            {cron && now && runs.length > 0 && runs.length < runCount && (
              <div className="text-xs text-text-faint">Only {runs.length} in the next 8 years.</div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          <span className={status.tone}>● {status.text}</span>
          {status.detail && <span>{status.detail}</span>}
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>

      <CronParserContent />
    </ToolShell>
  );
}
