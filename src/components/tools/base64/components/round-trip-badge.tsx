"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface RoundTripBadgeProps {
  ok: boolean | null;
}

export function RoundTripBadge({ ok }: RoundTripBadgeProps) {
  if (ok === null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm font-medium",
        ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-danger/30 bg-danger/10 text-danger",
      )}
      aria-live="polite"
    >
      {ok
        ? (<><CheckCircle2 size={14} aria-hidden /> Round-trip OK</>)
        : (<><XCircle size={14} aria-hidden /> Round-trip mismatch</>)}
    </span>
  );
}
