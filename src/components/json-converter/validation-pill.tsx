"use client";

import { Tooltip } from "@/components/primitives/tooltip";

interface ValidationPillProps {
  ok: boolean;
  /** Short label, e.g. "Schema accepts sample". */
  label: string;
  /** Longer tooltip explaining what was validated and how it failed. */
  detail?: string;
}

/**
 * Round-trip trust signal for the status bar: proves the generated schema
 * accepts the very sample it came from (or says exactly where it doesn't).
 */
export function ValidationPill({ ok, label, detail }: ValidationPillProps) {
  const pill = (
    <span
      tabIndex={detail ? 0 : undefined}
      className={ok ? "text-success-text" : "text-error-text"}
    >
      {ok ? "✓" : "✕"} {label}
    </span>
  );
  if (!detail) return pill;
  return <Tooltip content={detail} side="top">{pill}</Tooltip>;
}
