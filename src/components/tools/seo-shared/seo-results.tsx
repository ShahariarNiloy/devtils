"use client";

import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import {
  countChecks,
  highlight,
  sortChecks,
  summaryChips,
  type Check,
  type CheckLevel,
  type HighlightLang,
  type TokenKind,
} from "./seo.lib";
import { CHECK_TONE, LEVEL_DOT } from "./seo-tones";

/* ── Checks ─────────────────────────────────────────────────────────── */

/** Summary chips + sorted check rows (top of the results column). */
export function SeoChecks({ checks }: { checks: readonly Check[] }) {
  const sorted = useMemo(() => sortChecks(checks), [checks]);
  const chips = useMemo(() => summaryChips(countChecks(checks)), [checks]);
  return (
    <div className="flex flex-col gap-1.5 px-3.5 pt-3.5 pb-1">
      <div className="mb-1 flex flex-wrap gap-1.5">
        {chips.map((s) => (
          <span
            key={s.label}
            className={cn(
              "inline-flex min-h-[30px] items-center rounded-full px-[11px] text-xs font-bold",
              CHECK_TONE[s.level].bg,
              CHECK_TONE[s.level].text,
            )}
          >
            {s.label}
          </span>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Checks">
        {sorted.map((c, i) => (
          <li key={i} className={cn("flex items-start gap-2.5 rounded-[10px] px-3 py-[9px]", CHECK_TONE[c.level].bg)}>
            <span aria-hidden="true" className={cn("flex-[0_0_18px] font-bold", CHECK_TONE[c.level].text)}>
              {CHECK_TONE[c.level].icon}
            </span>
            <span className="sr-only">{LEVEL_NAME[c.level]}: </span>
            <span className="min-w-0 text-[13px] leading-normal break-words text-text-key">{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const LEVEL_NAME: Record<CheckLevel, string> = { err: "Error", warn: "Warning", info: "Note", ok: "Pass" };

/* ── Table ──────────────────────────────────────────────────────────── */

export interface SeoTableRow {
  level: "err" | "warn" | "ok";
  /** Short mono key (teal), e.g. an hreflang code. */
  a: string;
  /** Mono value, e.g. a URL. */
  b: string;
  note: string;
}

const NOTE_TONE: Record<SeoTableRow["level"], string> = {
  err: "text-error-text",
  warn: "text-[#f0c9a0]",
  ok: "text-success-text",
};

/** Per-item audit rows (✓ / ! / ✕ · key · value · note). */
export function SeoTable({ rows, label }: { rows: readonly SeoTableRow[]; label: string }) {
  if (!rows.length) return null;
  return (
    <ul aria-label={label} className="mx-3.5 mt-3 mb-0 list-none overflow-hidden rounded-xl border border-white/[.07] p-0">
      {rows.map((r, i) => (
        <li
          key={i}
          className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-white/5 px-3 py-[9px] last:border-b-0"
        >
          <span aria-hidden="true" className={cn("flex-[0_0_16px] font-bold", LEVEL_DOT[r.level])}>
            {CHECK_TONE[r.level].icon}
          </span>
          <span className="flex-none font-mono text-xs text-syntax-key">{r.a}</span>
          <span className="min-w-0 flex-[1_1_180px] font-mono text-xs break-all text-syntax-plain">{r.b}</span>
          <span className={cn("basis-full pl-[26px] text-xs", NOTE_TONE[r.level])}>{r.note}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Code panel ─────────────────────────────────────────────────────── */

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "text-syntax-plain",
  punct: "text-syntax-punctuation",
  tag: "text-syntax-key",
  attr: "text-syntax-boolean",
  string: "text-syntax-string",
  number: "text-syntax-number",
  bool: "text-syntax-boolean",
  entity: "text-syntax-number",
  comment: "text-text-faint",
  key: "text-syntax-key",
  value: "text-code-clay",
  allow: "text-success",
  disallow: "text-error",
  agent: "text-syntax-boolean",
};

export interface SeoMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

interface CodePanelProps<T extends string> {
  /** The exact text that Copy puts on the clipboard. */
  text: string;
  lang: HighlightLang;
  /** Header label when there are no tabs ("robots.txt"). */
  label?: string;
  /** Output-format tabs ("HTML <head>", "HTTP header" …). */
  tabs?: readonly { id: T; label: string }[];
  tab?: T;
  onTab?: (id: T) => void;
  /** Extra actions behind ⋯ (download, sample, clear). */
  menu?: readonly SeoMenuItem[];
  /** Shown when `text` is empty. */
  emptyText?: string;
}

/** Highlighted, line-numbered output with format tabs, Copy and a ⋯ menu. */
export function SeoCodePanel<T extends string>({ text, lang, label = "Output", tabs, tab, onTab, menu, emptyText }: CodePanelProps<T>) {
  const lines = useMemo(() => highlight(text, lang), [text, lang]);
  const { copied, copy } = useCopy();

  return (
    <div className="mx-3.5 mt-3 mb-3.5 flex flex-col overflow-hidden rounded-xl border border-white/[.07] bg-[#0d0d0c]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle py-1.5 pr-1.5 pl-3">
        {tabs && tabs.length > 0 ? (
          <div role="tablist" aria-label="Output format" className="flex flex-wrap gap-0.5">
            {tabs.map((t) => {
              const on = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onTab?.(t.id)}
                  className={cn(
                    "min-h-[34px] cursor-pointer rounded-[7px] px-2.5 text-xs font-semibold transition-colors",
                    on ? "bg-selected text-text" : "text-text-tertiary hover:text-text",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-xs font-bold text-text-muted">{label}</span>
        )}
        <span className="grow" />
        {menu && menu.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                className="flex size-[34px] cursor-pointer items-center justify-center rounded-[7px] text-text-tertiary transition-colors hover:bg-selected hover:text-text"
              >
                <MoreHorizontal size={16} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menu.map((m) => (
                <DropdownMenuItem key={m.label} onClick={m.onSelect} disabled={m.disabled} className="flex items-center gap-2.5">
                  {m.icon && <span aria-hidden="true" className="text-text-faint">{m.icon}</span>}
                  <span className="grow">{m.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          type="button"
          onClick={() => copy(text)}
          disabled={!text}
          className="btn-action min-h-[34px] cursor-pointer rounded-[7px] px-3 text-xs font-bold disabled:cursor-default disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="py-2.5 font-mono text-[12.5px] leading-[1.7]" aria-label={label} role="region">
        {lines.length === 0 ? (
          <div className="px-3 text-text-faint">{emptyText ?? "Nothing to show yet."}</div>
        ) : (
          lines.map((toks, i) => (
            <div key={i} className="flex">
              <span aria-hidden="true" className="w-[30px] shrink-0 pr-2.5 text-right text-text-ghost select-none sm:w-10">
                {i + 1}
              </span>
              <span className="min-w-0 pr-3 break-all whitespace-pre-wrap">
                {toks.map((t, j) => (
                  <span key={j} className={TOKEN_CLASS[t.k]}>
                    {t.v}
                  </span>
                ))}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Hooks / helpers ────────────────────────────────────────────────── */

/** Clipboard copy with a 1.4s "Copied" label (mockup timing). */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  }, []);
  return { copied, copy };
}

/** Save text as a local file (no upload — a Blob URL in this tab). */
export function downloadText(filename: string, text: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
