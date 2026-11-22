"use client";

import { BookOpen, Clock, Code2, Copy, Link2, ListChecks, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { MATCH_CAP, toRegExpConstructor, toRegexLiteral } from "../regex.lib";
import { FLAG_TITLES, TOOLBAR_FLAGS } from "../hooks/use-regex-state";
import type { RegexTesterState } from "../hooks/use-regex-tester";

interface PatternToolbarProps {
  state: RegexTesterState;
  onOpenLibrary: () => void;
  onOpenHistory: () => void;
}

/** v2 toolbar: /pattern/flags field, g i m s u keys, live match count, ⋯. */
export function PatternToolbar({ state, onOpenLibrary, onOpenHistory }: PatternToolbarProps) {
  // Destructure up front: `state` carries a ref, so reading through it in
  // render trips the React compiler's ref rule.
  const {
    pattern, flags, compiled, matches, patternRef, history, showExamples,
    setPattern, setFlags, setSelectedMatch, setShowExamples, handleCopyMatches, handleShare,
  } = state;
  const flagStr = flags.join("");
  const invalid = !compiled.ok;

  const toggleFlag = (f: string) => {
    setFlags(flags.includes(f) ? flags.filter((x) => x !== f) : [...flags, f]);
    setSelectedMatch(null);
  };

  let count: { label: string; tone: string };
  if (invalid) count = { label: "Invalid pattern", tone: "bg-error/14 text-error-text" };
  else if (matches.length) {
    const capped = matches.length >= MATCH_CAP ? `${MATCH_CAP}+` : String(matches.length);
    // Without `g`, JS stops at the first match — say so, so "1 match" isn't
    // mistaken for the total.
    const suffix = flags.includes("g") ? "" : " · first only";
    count = { label: `${capped} ${matches.length === 1 ? "match" : "matches"}${suffix}`, tone: "bg-success/14 text-success-text" };
  } else count = { label: "0 matches", tone: "bg-white/6 text-text-tertiary" };

  const sticky = flags.includes("y");

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3">
      <label
        className={cn(
          "flex min-h-[46px] min-w-0 flex-[1_1_320px] items-center gap-1 rounded-[11px] border bg-[#0d0d0c] px-3 font-mono text-[15px] transition-colors",
          invalid ? "border-error-border" : "border-white/10 focus-within:border-clay-light/50",
        )}
      >
        <span aria-hidden="true" className="text-text-faint">/</span>
        <span className="sr-only">Regular expression</span>
        <input
          ref={patternRef}
          type="text"
          value={pattern}
          onChange={(e) => {
            setPattern(e.target.value);
            setSelectedMatch(null);
          }}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Type a pattern"
          className="min-h-10 min-w-0 grow border-0 bg-transparent font-mono text-clay-cream outline-none placeholder:text-placeholder"
        />
        <span aria-hidden="true" className="text-text-faint">/{flagStr}</span>
      </label>

      <div role="group" aria-label="Flags" className="flex gap-1">
        {TOOLBAR_FLAGS.map((f) => {
          const on = flags.includes(f);
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              title={FLAG_TITLES[f]}
              aria-label={`${f} — ${FLAG_TITLES[f]}`}
              onClick={() => toggleFlag(f)}
              className={cn(
                "size-11 rounded-[10px] border font-mono text-sm font-medium transition-colors",
                on
                  ? "border-clay-light/55 bg-clay-light/14 text-clay-cream"
                  : "border-white/10 text-text-faint hover:border-white/20 hover:text-text",
              )}
            >
              {f}
            </button>
          );
        })}
      </div>

      <span
        aria-live="polite"
        className={cn("inline-flex min-h-9 items-center gap-[7px] rounded-full px-3 text-[13px] font-semibold", count.tone)}
      >
        {count.label}
      </span>

      {/* Everything the mockup doesn't show lives in one quiet menu. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="ml-auto flex size-11 items-center justify-center rounded-[10px] text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-64">
          <MenuRow icon={<BookOpen size={14} />} label="Pattern library" hint="⌘⇧L" onClick={onOpenLibrary} />
          <MenuRow icon={<Clock size={14} />} label={`Recent patterns${history.length ? ` (${history.length})` : ""}`} onClick={onOpenHistory} />
          <MenuRow
            icon={<ListChecks size={14} />}
            label={showExamples ? "Hide sample matches" : "Generate sample matches"}
            onClick={() => setShowExamples((v) => !v)}
            disabled={invalid}
          />
          <MenuRow
            icon={<span className="font-mono text-[12px]">y</span>}
            label={sticky ? "Turn off sticky flag (y)" : "Turn on sticky flag (y)"}
            onClick={() => toggleFlag("y")}
          />
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px]">Copy {matches.length} {matches.length === 1 ? "match" : "matches"} as</DropdownMenuLabel>
          <MenuRow icon={<Copy size={14} />} label="Lines" onClick={() => handleCopyMatches("lines")} disabled={!matches.length} />
          <MenuRow icon={<Copy size={14} />} label="JSON array" onClick={() => handleCopyMatches("json")} disabled={!matches.length} />
          <MenuRow icon={<Copy size={14} />} label="CSV" onClick={() => handleCopyMatches("csv")} disabled={!matches.length} />
          <DropdownMenuSeparator />
          <MenuRow icon={<Code2 size={14} />} label="Copy as /regex/ literal" onClick={() => copyCode(toRegexLiteral(pattern, flagStr))} disabled={invalid || !pattern} />
          <MenuRow icon={<Code2 size={14} />} label="Copy as new RegExp(…)" onClick={() => copyCode(toRegExpConstructor(pattern, flagStr))} disabled={invalid || !pattern} />
          <MenuRow icon={<Link2 size={14} />} label="Copy share link" onClick={handleShare} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function copyCode(code: string) {
  void navigator.clipboard.writeText(code);
  toast.success("Copied", { description: code.length > 80 ? `${code.slice(0, 80)}…` : code });
}

function MenuRow({ icon, label, hint, onClick, disabled }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <DropdownMenuItem onSelect={onClick} disabled={disabled} className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex w-3.5 justify-center text-text-faint">{icon}</span>
      <span className="grow">{label}</span>
      {hint && <span className="font-mono text-[11px] text-text-faint">{hint}</span>}
    </DropdownMenuItem>
  );
}
