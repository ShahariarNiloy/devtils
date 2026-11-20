"use client";

import type { ProblemReport } from "../json-problems";
import type { ValidationState } from "../json-formatter.types";

interface ErrorBannerProps {
  validation: Extract<ValidationState, { status: "invalid" }>;
  /** Null while the input is too large to scan — falls back to the parse error. */
  report: ProblemReport | null;
  onRepair: () => void;
  /** Hide the Repair CTA (e.g. the JS→JSON banner is already offering a fix). */
  hideRepair?: boolean;
}

function repairLabel(n: number): string {
  if (n <= 1) return "Repair it";
  if (n === 2) return "Repair both";
  return `Repair all ${n}`;
}

/**
 * Window-level problem banner: how many problems, where, and one button that
 * fixes them. Shows at most three locations inline; the count is honest.
 */
export function ErrorBanner({ validation, report, onRepair, hideRepair }: ErrorBannerProps) {
  const problems = report?.problems ?? [];
  const count = problems.length;
  const headline = count > 0 ? `${count} problem${count === 1 ? "" : "s"} found` : "Invalid JSON";
  const details =
    count > 0
      ? problems.slice(0, 3).map((p) => `Line ${p.line}: ${p.text}`).join(" · ") + (count > 3 ? ` · +${count - 3} more` : "")
      : `Line ${validation.line}, col ${validation.col}: ${validation.message}`;
  const canRepair = !hideRepair && (report === null || report.repairable);

  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-error-border bg-error-bg px-4 py-2.5 text-[13px]">
      <span className="inline-flex items-center gap-2 font-semibold text-error-text">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
        {headline}
      </span>
      <span className="min-w-0 text-[#d9b3a6]">{details}</span>
      <span className="grow" />
      {canRepair && (
        <button
          type="button"
          onClick={onRepair}
          className="min-h-8 rounded-lg bg-error-text px-3 text-[13px] font-bold text-[#2a1410] transition-opacity hover:opacity-90"
        >
          {count > 0 ? repairLabel(count) : "Try Repair"}
        </button>
      )}
    </div>
  );
}
