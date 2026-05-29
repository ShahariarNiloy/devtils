"use client";

import { Check, X } from "lucide-react";
import { Tooltip } from "@/components/primitives/tooltip";

interface ValidationPillProps {
  ok: boolean;
  /** Short label, e.g. "Schema validates sample". */
  label: string;
  /** Longer tooltip explaining what was validated and how it failed. */
  detail?: string;
}

/**
 * Trust-signal pill rendered near a tool's output. Catches regressions in
 * the codegen pipeline AND signals to visitors that the output isn't
 * vapourware — it actually round-trips against their input. Tools opt in
 * by computing an `ok` boolean and passing a short label.
 */
export function ValidationPill({ ok, label, detail }: ValidationPillProps) {
  const pill = (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2 h-6 text-[11px] font-medium transition-colors " +
        (ok
          ? "bg-[color:var(--color-tier-free-bg)] text-[color:var(--color-success)]"
          : "bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]")
      }
    >
      {ok ? <Check size={11} aria-hidden /> : <X size={11} aria-hidden />}
      {label}
    </span>
  );
  if (!detail) return pill;
  return <Tooltip content={detail} side="top">{pill}</Tooltip>;
}
