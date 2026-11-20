"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { DETECTED_FORMAT_LABEL, FORMAT_OVERRIDES } from "../timestamp-converter.constants";
import type { WorldZoneRow } from "../timestamp-converter.lib";
import type { DetectedFormat, ParseResult, ToolMode } from "../timestamp-converter.types";

// ── Toolbar: input, kind pill, Now ─────────────────────────────────

interface TimeToolbarProps {
  value: string;
  onChange: (v: string) => void;
  parseResult: ParseResult;
  onOverride: (f: DetectedFormat) => void;
  onNow: () => void;
  menu: React.ReactNode;
}

const pillBase = "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold";

export const TimeToolbar = forwardRef<HTMLInputElement, TimeToolbarProps>(function TimeToolbar(
  { value, onChange, parseResult, onOverride, onNow, menu },
  ref,
) {
  const empty = value.trim() === "";
  const ok = parseResult.ok;
  const invalid = !empty && !ok;
  const numeric = /^[+-]?\d+(\.\d+)?$/.test(value.trim());
  const label = DETECTED_FORMAT_LABEL[parseResult.detectedFormat];

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3.5">
      <label
        className={cn(
          "flex min-w-0 flex-[1_1_320px] flex-col gap-1 rounded-[11px] border bg-[#0d0d0c] px-3 py-2 transition-colors focus-within:border-clay-light/50",
          invalid ? "border-error-border" : "border-white/10",
        )}
      >
        <span className="text-[11px] font-bold text-text-faint">Unix time or date</span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid}
          placeholder="1795194000, 1795194000000 or 2026-11-20 17:00"
          className="min-h-8 min-w-0 border-0 bg-transparent font-mono text-xl text-text outline-none placeholder:text-placeholder"
        />
      </label>

      {ok && numeric ? (
        // All-digit inputs are ambiguous by nature — let the pill reinterpret.
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Reinterpret this number"
              className={cn(pillBase, "bg-success/14 text-success-text transition-colors hover:bg-success/20")}
            >
              {label}
              {parseResult.ambiguous && <span className="font-normal opacity-80">· ambiguous</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Treat this number as</DropdownMenuLabel>
            {FORMAT_OVERRIDES.map((f) => (
              <DropdownMenuItem key={f} onClick={() => onOverride(f)}>
                {DETECTED_FORMAT_LABEL[f]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : ok ? (
        <span className={cn(pillBase, "bg-success/14 text-success-text")}>{label}</span>
      ) : invalid ? (
        <span className={cn(pillBase, "bg-error/14 text-error-text")} title={parseResult.error}>
          Unrecognised
        </span>
      ) : null}

      <button type="button" onClick={onNow} className="btn-action min-h-12 shrink-0 rounded-[11px] px-[18px] text-sm font-bold">
        Now
      </button>
      {menu}
    </div>
  );
});

// ── Convert view: relative headline, rows, world zones ─────────────

export function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = useCallback((key: string, text: string) => {
    void navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(key);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1400);
  }, []);
  return { copied, copy };
}

interface ConvertViewProps {
  ok: boolean;
  relative: string;
  dateLine: string;
  rows: { k: string; v: string }[];
  zones: WorldZoneRow[];
}

export function ConvertView({ ok, relative, dateLine, rows, zones }: ConvertViewProps) {
  const { copied, copy } = useCopied();
  return (
    <div className="flex flex-col md:min-h-[420px] md:flex-row">
      <div className="min-w-0 border-b border-border-subtle p-2 md:flex-[1.3_1_360px] md:border-r md:border-b-0">
        <div
          aria-live="polite"
          className={cn("px-2.5 pt-2.5 pb-1 text-[32px] font-bold tracking-[-0.03em]", ok ? "text-text" : "text-text-faint")}
        >
          {relative}
        </div>
        <div className="px-2.5 pb-3 text-[13px] text-text-faint">{dateLine}</div>
        {rows.map((r) => (
          <div key={r.k} className="flex min-h-[52px] items-center gap-3 border-t border-white/5 py-1 pr-2 pl-2.5">
            <span className="shrink-0 basis-[92px] text-xs font-bold text-text-faint">{r.k}</span>
            <span className="min-w-0 grow font-mono text-[12.5px] break-all text-text sm:text-[13px]">{r.v}</span>
            <button
              type="button"
              aria-label={`Copy ${r.k}`}
              onClick={() => copy(r.k, r.v)}
              className="h-10 min-w-11 shrink-0 rounded-[9px] border border-border px-2.5 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
            >
              {copied === r.k ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-2 p-3.5 md:flex-[1_1_300px]">
        <div className="text-xs text-text-faint">Around the world</div>
        {zones.map((z) => (
          <div key={z.zone} className="surface-panel flex items-center gap-2.5 rounded-[11px] px-3 py-2.5">
            <span className="flex min-w-0 grow flex-col">
              <span className="text-[13px] font-bold">{z.city}</span>
              <span className="text-[11px] text-text-faint">{z.zone}</span>
            </span>
            <span className="text-right font-mono text-[13px] text-text">
              {ok ? z.time : "—"}
              <br />
              <span className="text-[11px] text-text-faint">{ok ? z.date : ""}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ⋯ menu ─────────────────────────────────────────────────────────

export type TimeExtra = "zones" | "formats" | "reference" | "code" | "history";

const MODES: { id: ToolMode; label: string; key: string }[] = [
  { id: "single", label: "Convert", key: "⌘1" },
  { id: "compare", label: "Compare time zones", key: "⌘2" },
  { id: "arithmetic", label: "Date arithmetic", key: "⌘3" },
  { id: "batch", label: "Batch convert", key: "⌘4" },
];

const EXTRAS: { id: TimeExtra; label: string }[] = [
  { id: "zones", label: "Primary & secondary zones" },
  { id: "formats", label: "All formats (µs, ns, RFC 3339…)" },
  { id: "reference", label: "Quick reference" },
  { id: "code", label: "Code snippets" },
  { id: "history", label: "Pinned & history" },
];

interface MoreMenuProps {
  mode: ToolMode;
  onMode: (m: ToolMode) => void;
  open: ReadonlySet<TimeExtra>;
  onToggle: (id: TimeExtra) => void;
  onSwap: () => void;
  onPermalink: () => void;
  onShortcuts: () => void;
  className?: string;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto pl-4 font-mono text-[10px] text-text-faint">{children}</span>;
}

export function MoreMenu({ mode, onMode, open, onToggle, onSwap, onPermalink, onShortcuts, className }: MoreMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More timestamp tools"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-[11px] border border-white/10 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text",
            className,
          )}
        >
          <MoreHorizontal size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] min-w-60 overflow-y-auto">
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        {MODES.map((m) => (
          <DropdownMenuCheckboxItem key={m.id} checked={mode === m.id} onCheckedChange={() => onMode(m.id)}>
            {m.label}
            <Kbd>{m.key}</Kbd>
          </DropdownMenuCheckboxItem>
        ))}
        {mode === "single" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Show</DropdownMenuLabel>
            {EXTRAS.map((x) => (
              <DropdownMenuCheckboxItem
                key={x.id}
                checked={open.has(x.id)}
                onCheckedChange={() => onToggle(x.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {x.label}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSwap}>
          Swap primary / secondary zone
          <Kbd>⌘⇧T</Kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPermalink}>
          Copy permalink
          <Kbd>⌘L</Kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShortcuts}>
          Keyboard shortcuts
          <Kbd>?</Kbd>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
