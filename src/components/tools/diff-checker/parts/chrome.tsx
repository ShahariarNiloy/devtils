"use client";

import { MoreHorizontal } from "lucide-react";
import { forwardRef, useSyncExternalStore, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared v2 chrome for the two compare tools (Diff checker, JSON diff):
 * count pills, the Swap / ⋯ buttons, side labels and the status bar.
 * Presentational only.
 */

export type PillTone = "added" | "removed" | "changed" | "neutral" | "warning" | "info";

const PILL_TONE: Record<PillTone, string> = {
  added: "bg-success/14 text-success-text",
  removed: "bg-error/14 text-error-text",
  changed: "bg-clay-light/14 text-clay-cream",
  neutral: "bg-text/6 text-text-muted",
  warning: "bg-warning/14 text-warning-text",
  info: "bg-info/14 text-info-text",
};

export function CountPill({ tone, children, title }: { tone: PillTone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold tabular-nums", PILL_TONE[tone])}
    >
      {children}
    </span>
  );
}

export function SwapButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Swap original and changed"
      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-border px-3 text-[13px] font-semibold text-text-key transition-colors hover:bg-surface-soft"
    >
      <span aria-hidden>⇄</span> Swap
    </button>
  );
}

/** ⋯ trigger — every feature the mockup doesn't draw lives behind it. */
export const MoreButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(function MoreButton(
  { className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="More options"
      className={cn(
        "inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-border text-text-key transition-colors hover:bg-surface-soft data-[state=open]:bg-selected",
        className,
      )}
      {...rest}
    >
      <MoreHorizontal size={17} aria-hidden />
    </button>
  );
});

/** Mockup "Ignore whitespace" pill switch (aria-pressed button). */
export function ToggleButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-border px-3 text-[13px] font-semibold text-text-key transition-colors hover:bg-surface-soft"
    >
      <span aria-hidden className={cn("relative inline-block h-5 w-[34px] rounded-full transition-colors", on ? "bg-accent" : "bg-[#3a3833]")}>
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-text transition-[left] motion-reduce:transition-none",
            on ? "left-4" : "left-0.5",
          )}
        />
      </span>
      {children}
    </button>
  );
}

/** Unified / Split segmented control. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px]">
      {options.map(([id, text]) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={cn(
              "min-h-[38px] cursor-pointer rounded-lg px-3.5 text-[13px] font-semibold transition-colors",
              on ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-text-tertiary hover:text-text",
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Header row above each input: coloured side marker + label + actions. */
export function SideHeader({
  side,
  label,
  meta,
  children,
}: {
  side: "left" | "right";
  label: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[42px] items-center gap-2 border-b border-border-subtle pr-2 pl-4">
      {/* Not a <label>: the code editor carries its own aria-label. */}
      <span className="flex items-center gap-2 text-[13px] font-bold">
        <span aria-hidden className={cn("size-2 rounded-[2px]", side === "left" ? "bg-error" : "bg-success")} />
        {label}
      </span>
      {meta && <span className="font-mono text-xs text-text-faint">{meta}</span>}
      <span className="grow" />
      {children}
    </div>
  );
}

export function SideAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-text-faint transition-colors hover:bg-surface-soft hover:text-text disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export type StatusTone = "ok" | "diff" | "error" | "idle";

const STATUS_TONE: Record<StatusTone, string> = {
  ok: "text-success",
  diff: "text-clay-light",
  error: "text-error",
  idle: "text-text-faint",
};

export function DiffStatusBar({ tone, text, detail }: { tone: StatusTone; text: string; detail?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
      <span className={STATUS_TONE[tone]} role="status">
        ● {text}
      </span>
      {detail && <span>{detail}</span>}
      <span className="grow" />
      <span className="text-success-text">Local-only</span>
    </div>
  );
}

/** Mockup "mobile" frame is < 640px (Tailwind `sm`). */
const BELOW_SM = "(max-width: 639px)";

function subscribeBelowSm(onChange: () => void): () => void {
  const mq = window.matchMedia(BELOW_SM);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useBelowSm(): boolean {
  return useSyncExternalStore(
    subscribeBelowSm,
    () => window.matchMedia(BELOW_SM).matches,
    () => false,
  );
}
