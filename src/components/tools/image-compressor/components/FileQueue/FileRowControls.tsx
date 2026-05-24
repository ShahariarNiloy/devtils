"use client";

import { cn } from "@/lib/cn";
import { AlertTriangle, Check } from "lucide-react";
import type { ReactNode } from "react";

interface BusyProps {
  label: string;
  active: boolean;
  reduceMotion: boolean;
}

export function BusyIndicator({ label, active, reduceMotion }: BusyProps) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          active ? "text-clay" : "text-text-faint",
        )}
      >
        {label}
      </span>
      {/* Keyframes: see globals.css `@keyframes indeterminate`. */}
      <span className="relative h-1.5 w-28 overflow-hidden rounded-full bg-surface-soft">
        {active ? (
          reduceMotion ? (
            <span className="absolute inset-0 bg-clay/60" />
          ) : (
            <span
              aria-hidden
              className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-clay/90 will-change-transform"
              style={{
                animation:
                  "indeterminate 1.1s cubic-bezier(0.65, 0, 0.35, 1) infinite",
              }}
            />
          )
        ) : (
          <span className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-text-faint/40" />
        )}
      </span>
    </span>
  );
}

/**
 * Renders the per-file size delta. Honest about regressions: positive
 * (file shrank) shows in success green with a minus prefix; negative
 * (file grew) shows in warning/clay with a plus prefix and an alert
 * icon so the user can't miss it.
 */
export function SavingsBadge({ savedPct }: { savedPct: number }) {
  if (savedPct > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-sm tabular-nums text-success"
        title={`Saved ${savedPct}%`}
      >
        <Check size={12} strokeWidth={2.5} aria-hidden />
        −{savedPct}%
      </span>
    );
  }
  if (savedPct < 0) {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-sm tabular-nums text-warning"
        title={`Output is ${Math.abs(savedPct)}% larger than the source`}
      >
        <AlertTriangle size={12} strokeWidth={2.5} aria-hidden />
        +{Math.abs(savedPct)}%
      </span>
    );
  }
  return (
    <span className="font-mono text-sm tabular-nums text-text-faint">±0%</span>
  );
}

export function IconButton({
  label,
  hoverClass,
  onClick,
  children,
}: {
  label: string;
  hoverClass?: string;
  /** Receives the click event. stopPropagation is handled internally
   *  so consumers don't have to think about it. */
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-[color,background-color,transform] duration-150 ease-out-strong hover:bg-surface-soft hover:text-text active:scale-[0.92] cursor-pointer",
        hoverClass,
      )}
    >
      {children}
    </button>
  );
}
