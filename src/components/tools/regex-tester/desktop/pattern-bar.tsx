"use client";

import { cn } from "@/lib/cn";
import { ALL_FLAGS, flagDescriptions, type Flag } from "../regex.lib";
import type { Compiled } from "../regex.lib";
import { FLAG_NAMES } from "../hooks/use-regex-state";

interface PatternBarProps {
  pattern: string;
  setPattern: (v: string) => void;
  flags: string[];
  setFlags: (v: string[]) => void;
  compiled: Compiled;
  setSelectedMatch: (v: number | null) => void;
  patternRef: React.RefObject<HTMLInputElement | null>;
}

export function PatternBar({
  pattern,
  setPattern,
  flags,
  setFlags,
  compiled,
  setSelectedMatch,
  patternRef,
}: PatternBarProps) {
  return (
    <div className="px-4 pt-3 pb-3">
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="regex-pattern-input"
          className="text-sm uppercase tracking-[0.08em] font-medium text-text-faint"
        >
          Regex pattern
        </label>
        <span className="text-sm text-text-faint hidden sm:inline">
          Press{" "}
          <kbd className="font-mono px-1 py-0.5 rounded border border-border-subtle bg-surface-soft text-text-muted">
            /
          </kbd>{" "}
          to focus
        </span>
      </div>

      {/* Input + flag chips — wrap to next row on narrow screens */}
      <div className="flex items-stretch gap-2 flex-wrap">
        {/* Pattern prompt */}
        <div
          className={cn(
            "flex-1 flex items-center min-w-[220px] rounded-xl border h-11 transition-[border-color,box-shadow]",
            compiled.ok
              ? "border-border bg-bg focus-within:border-border-strong focus-within:shadow-[0_0_0_3px_var(--color-mist-sage)]"
              : "border-danger/50 bg-danger/5 focus-within:border-danger focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-danger),transparent_70%)]",
          )}
        >
          <span className="font-mono text-base text-text-faint pl-3.5 pr-2 select-none shrink-0">
            /
          </span>
          <input
            id="regex-pattern-input"
            ref={patternRef}
            value={pattern}
            onChange={(e) => {
              setPattern(e.target.value);
              setSelectedMatch(null);
            }}
            placeholder="Type a regex pattern, e.g. \d+, \b\w+@\w+\.[a-z]{2,}\b"
            spellCheck={false}
            autoComplete="off"
            className={cn(
              "flex-1 min-w-0 h-full bg-transparent font-mono text-base outline-none border-0",
              compiled.ok ? "text-text" : "text-danger",
              "placeholder:text-text-faint/70 placeholder:font-normal",
            )}
            aria-label="Regex pattern"
          />
          <span className="font-mono text-base text-text-faint pl-2 pr-3.5 select-none shrink-0">
            /
          </span>
        </div>

        {/* Flag chips — letter-primary, name as faint subtitle */}
        <div className="flex gap-1.5 shrink-0" role="group" aria-label="Regex flags">
          {ALL_FLAGS.map((f) => {
            const active = flags.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFlags(active ? flags.filter((x) => x !== f) : [...flags, f]);
                  setSelectedMatch(null);
                }}
                title={flagDescriptions[f as Flag]}
                aria-pressed={active}
                aria-label={flagDescriptions[f as Flag]}
                className={cn(
                  "flex flex-col items-center justify-center px-2.5 rounded-md border transition-colors cursor-pointer min-w-[60px]",
                  active
                    ? "border-border-strong bg-surface-soft"
                    : "border-border bg-bg hover:border-border-strong hover:bg-surface-soft/40",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-sm font-semibold leading-none",
                    active ? "text-text" : "text-text-muted",
                  )}
                >
                  {f}
                </span>
                <span
                  className={cn(
                    "text-sm tracking-wide mt-0.5 leading-none",
                    active ? "text-text-muted" : "text-text-faint",
                  )}
                >
                  {FLAG_NAMES[f]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
