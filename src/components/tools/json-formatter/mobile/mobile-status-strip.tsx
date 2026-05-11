"use client";

import { AlertCircle, CheckCircle2, CircleDashed, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBytes } from "../json-formatter.lib";
import type { ValidationState } from "../json-formatter.types";

interface MobileStatusStripProps {
  validation: ValidationState;
  bytes: number;
  fileName: string | null;
}

export function MobileStatusStrip({ validation, bytes, fileName }: MobileStatusStripProps) {
  let badge: React.ReactNode;
  if (validation.status === "valid") {
    badge = (
      <span className="inline-flex items-center gap-1 text-success">
        <CheckCircle2 size={10} />
        Valid
      </span>
    );
  } else if (validation.status === "invalid") {
    badge = (
      <span className="inline-flex items-center gap-1 text-danger">
        <AlertCircle size={10} />
        Ln {validation.line}, col {validation.col}
      </span>
    );
  } else {
    badge = (
      <span className="inline-flex items-center gap-1 text-text-faint">
        <CircleDashed size={10} />
        Idle
      </span>
    );
  }

  return (
    <div
      className={cn(
        "no-scrollbar flex shrink-0 items-center justify-between gap-3 overflow-x-auto",
        "border-t border-border bg-surface-soft px-3 py-1.5 font-mono text-[10.5px] text-text-faint",
      )}
    >
      <div className="flex items-center gap-3 whitespace-nowrap">
        {badge}
        <Sep />
        <span>{formatBytes(bytes)}</span>
        {fileName && (
          <>
            <Sep />
            <span className="max-w-[160px] truncate" title={fileName}>
              {fileName}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <Lock size={10} className="opacity-70" />
        Local
      </div>
    </div>
  );
}

function Sep() {
  return <span className="text-border-strong/40" aria-hidden>·</span>;
}
