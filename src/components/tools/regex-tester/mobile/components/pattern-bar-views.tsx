"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { AlertCircle, Check, ChevronDown, Flag, ListChecks } from "lucide-react";
import { ALL_FLAGS, flagDescriptions } from "../../regex.lib";
import type { MobileState } from "../types";
import { useStickyPatternBar } from "../hooks/use-sticky-pattern-bar";

const FLAG_NAMES: Record<string, string> = {
  g: "global",
  i: "ignore case",
  m: "multiline",
  s: "dotall",
  u: "unicode",
  y: "sticky",
};

interface BarProps {
  state: MobileState;
  onOpenSamples?: () => void;
}

// ── Expanded ─────────────────────────────────────────────────────────────────

export function ExpandedBar({ state, onOpenSamples }: BarProps) {
  const { pattern, setPattern, flags, compiled } = state;
  const { inputRef, showEmptyState, activateEdit, toggleFlag, handleBlur } =
    useStickyPatternBar(state);

  return (
    <motion.div layout className="p-3 space-y-2">
      <div className="space-y-2.5">
        {/* Row 1: input label · Sample matches · flag dropdown */}
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="mobile-regex-pattern"
            className="text-sm uppercase tracking-wide font-semibold text-text-faint shrink-0"
          >
            Pattern
          </label>
          <div className="flex items-center gap-1.5">
            {onOpenSamples && (
              <button
                type="button"
                onClick={onOpenSamples}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-sm text-text-muted hover:border-border-strong hover:text-text transition-colors cursor-pointer"
                aria-label="Open sample matches"
              >
                <ListChecks size={14} aria-hidden />
                Samples
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-sm text-text-muted hover:border-border-strong hover:text-text transition-colors cursor-pointer"
                  aria-label={`${flags.length} active flags — change`}
                >
                  <Flag size={14} aria-hidden />
                  {flags.length} {flags.length === 1 ? "flag" : "flags"}
                  <ChevronDown size={14} className="text-text-faint" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {ALL_FLAGS.map((f) => {
                  const active = flags.includes(f);
                  return (
                    <DropdownMenuItem
                      key={f}
                      onSelect={(e) => { e.preventDefault(); toggleFlag(f); }}
                      title={flagDescriptions[f]}
                      className="flex items-center gap-2"
                    >
                      <Check size={14} className={cn("shrink-0", !active && "opacity-0")} aria-hidden />
                      <span className="font-mono text-sm font-semibold w-4">{f}</span>
                      <span className="text-sm text-text-muted">{FLAG_NAMES[f]}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: pattern input — tap-to-write empty state, otherwise / pattern / */}
        {showEmptyState ? (
          <button
            type="button"
            onClick={activateEdit}
            className="w-full flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-subtle bg-bg/60 py-5 px-3 cursor-text transition-colors hover:border-border"
            aria-label="Write a pattern"
          >
            <span className="font-mono text-base text-text-faint">/ — /</span>
            <span className="text-sm text-text-faint">Tap to write a pattern</span>
          </button>
        ) : (
          <div
            className={cn(
              "flex items-center min-w-0 rounded-lg border h-11 transition-colors",
              compiled.ok
                ? "border-border bg-surface focus-within:border-border-strong"
                : "border-danger/50 bg-danger/5 focus-within:border-danger"
            )}
          >
            <span className="font-mono text-base text-text-faint pl-3 pr-1.5 select-none shrink-0">/</span>
            <input
              id="mobile-regex-pattern"
              ref={inputRef}
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              onBlur={handleBlur}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              className={cn(
                "flex-1 min-w-0 h-full bg-transparent font-mono text-base outline-none border-0",
                compiled.ok ? "text-text" : "text-danger",
                "placeholder:text-text-faint/70"
              )}
              aria-label="Regex pattern"
            />
            <span className="font-mono text-base text-text-faint pl-1.5 pr-3 select-none shrink-0">/</span>
          </div>
        )}
      </div>

      {/* Error card — appears below the pattern card when invalid */}
      {!compiled.ok && pattern && <ErrorCard message={compiled.message} />}
    </motion.div>
  );
}

// ── Collapsed ────────────────────────────────────────────────────────────────

export function CollapsedBar({ state }: { state: MobileState }) {
  const { pattern, compiled, setActiveView } = state;

  return (
    <motion.button
      layout
      type="button"
      onClick={() => setActiveView("editor")}
      className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left cursor-pointer"
      aria-label="Edit pattern"
    >
      <span className="font-mono text-base text-text-faint shrink-0">/</span>
      <span className={cn("flex-1 min-w-0 font-mono text-base truncate", compiled.ok ? "text-text" : "text-danger")}>
        {pattern || <span className="text-text-faint">(empty pattern)</span>}
      </span>
      <span className="font-mono text-base text-text-faint shrink-0">/</span>
    </motion.button>
  );
}

// ── Error card ──────────────────────────────────────────────────────────────

function ErrorCard({ message }: { message: string }) {
  const cleanMessage = message
    .replace(/^Invalid regular expression:\s*\/.*?\/[gimsuy]*:\s*/i, "")
    .trim();

  const match = cleanMessage.match(
    /^(.+?)(?:\s+at\s+(?:offset|column)\s+(\d+))?(?:\s+—\s+(.+))?$/i
  );
  const title = match?.[1]?.trim() ?? cleanMessage;
  const column = match?.[2];
  const detail = match?.[3];

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-error-border bg-error-bg p-3">
      <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-danger break-words">{title}</p>
        {(column || detail) && (
          <p className="text-sm text-text-muted mt-0.5 break-words">
            {column && <>at column {column}</>}
            {column && detail && " — "}
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
