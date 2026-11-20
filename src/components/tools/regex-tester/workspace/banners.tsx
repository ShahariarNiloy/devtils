"use client";

import type { RegexTesterState } from "../hooks/use-regex-tester";

/**
 * Full-width notices under the toolbar: compile error (mockup), plus the
 * ReDoS warning and the 2s worker timeout — same strip, warning/error tones.
 */
export function RegexBanners({ state }: { state: RegexTesterState }) {
  const { compiled, redos, regexTimedOut } = state;
  return (
    <>
      {!compiled.ok && (
        <div role="alert" className="border-b border-error-border bg-error-bg px-4 py-2.5 text-[13px] text-error-text">
          Pattern error: {compiled.message}
        </div>
      )}
      {compiled.ok && regexTimedOut && (
        <div role="alert" className="border-b border-error-border bg-error-bg px-4 py-2.5 text-[13px] text-error-text">
          Pattern stopped after 2s — it&apos;s too slow on this input (catastrophic backtracking). Simplify the pattern or
          test on shorter text.
        </div>
      )}
      {compiled.ok && !redos.safe && redos.warning && (
        <div role="status" className="border-b border-warning-border bg-warning-bg px-4 py-2.5 text-[13px] text-warning-text">
          {redos.warning}
        </div>
      )}
    </>
  );
}
