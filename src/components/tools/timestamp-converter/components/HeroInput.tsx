"use client";

import { forwardRef } from "react";
import { AlertCircle, Clock, ScanLine, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import type { DetectedFormat, ParseResult } from "../timestamp-converter.types";

const OVERRIDES: { id: DetectedFormat; label: string }[] = [
  { id: "unix-s", label: "Unix seconds" },
  { id: "unix-ms", label: "Unix milliseconds" },
  { id: "unix-us", label: "Unix microseconds" },
  { id: "unix-ns", label: "Unix nanoseconds" },
  { id: "excel-serial", label: "Excel serial" },
];

const FORMAT_LABEL: Record<DetectedFormat, string> = {
  "unix-s": "Unix seconds",
  "unix-ms": "Unix milliseconds",
  "unix-us": "Unix microseconds",
  "unix-ns": "Unix nanoseconds",
  "iso-8601": "ISO 8601",
  "rfc-2822": "RFC 2822",
  "rfc-3339": "RFC 3339",
  "js-date-string": "JS Date string",
  "log-format": "Log format",
  "natural-language": "Natural language",
  "excel-serial": "Excel serial",
  unknown: "Unrecognised",
};

interface Props {
  value: string;
  onChange: (v: string) => void;
  onUseNow: () => void;
  onClear: () => void;
  onOverride: (f: DetectedFormat) => void;
  parseResult: ParseResult;
  nowUnix: number;
}

export const HeroInput = forwardRef<HTMLInputElement, Props>(
  function HeroInput(
    { value, onChange, onUseNow, onClear, onOverride, parseResult, nowUnix },
    ref,
  ) {
    const ok = parseResult.ok;
    const empty = value.trim().length === 0;
    const invalid = !empty && !ok;

    return (
      <div className="flex flex-col gap-2.5">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-text-faint">
          <span className="mr-1.5 text-text-faint/60">•</span>
          Paste any timestamp · Unix · ISO 8601 · RFC · or type “now”,
          “yesterday”, “+3 days”
        </p>

        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border bg-surface px-5 py-4 shadow-card",
            invalid ? "border-danger" : "border-border",
          )}
        >
          <input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            placeholder="1700000000"
            aria-label="Timestamp input"
            aria-invalid={invalid}
            className="min-w-0 flex-1 bg-transparent font-mono text-3xl text-text outline-none placeholder:text-text-faint"
          />
          <button
            type="button"
            onClick={onClear}
            disabled={empty}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-text disabled:opacity-30 cursor-pointer"
          >
            <Trash2 size={15} aria-hidden />
            Clear
          </button>
          <button
            type="button"
            onClick={onUseNow}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-bg transition-colors hover:bg-brand-hover cursor-pointer"
          >
            <Clock size={15} aria-hidden />
            Use now
          </button>
        </div>

        <div className="flex min-h-[28px] flex-wrap items-center gap-x-3 gap-y-1.5">
          {!empty &&
            (ok ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-soft px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-text-muted transition-colors hover:text-text cursor-pointer"
                  >
                    <ScanLine size={13} aria-hidden />
                    Detected: {FORMAT_LABEL[parseResult.detectedFormat]}
                    {parseResult.ambiguous && (
                      <span className="font-normal normal-case text-text-faint">
                        · ambiguous
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {OVERRIDES.map((o) => (
                    <DropdownMenuItem
                      key={o.id}
                      onClick={() => onOverride(o.id)}
                    >
                      Treat as {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-danger">
                <AlertCircle size={13} aria-hidden />
                {parseResult.error ?? "Unrecognised"}
              </span>
            ))}
          {!empty && ok && (
            <span className="text-sm text-text-faint">
              Click chip to override
            </span>
          )}

          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-text-faint">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-success"
            />
            Now
            <span className="font-mono text-text-muted">{nowUnix}</span>
          </span>
          <span className="flex items-center gap-1 text-[12px] text-text-faint">
            <kbd className="rounded border border-border-subtle bg-surface-soft px-1 font-mono text-[11px]">
              ⌘
            </kbd>
            <kbd className="rounded border border-border-subtle bg-surface-soft px-1 font-mono text-[11px]">
              K
            </kbd>
            focus
          </span>
        </div>
      </div>
    );
  },
);
