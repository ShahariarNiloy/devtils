"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const SR_ONLY = "absolute h-px w-px overflow-hidden [clip:rect(0_0_0_0)]";
const FIELD_BOX = "rounded-[10px] border border-white/10 bg-[#0d0d0c] transition-colors focus-within:border-clay-light/50";

export type CounterTone = "faint" | "ok" | "warn" | "err";

const COUNTER_TONE: Record<CounterTone, string> = {
  faint: "text-text-faint",
  ok: "text-success-text",
  warn: "text-[#f0c9a0]",
  err: "text-error-text",
};

interface SeoFieldProps {
  /** Visible label above the control (omit for none). */
  label?: string;
  /** Optional mono counter on the label row ("54 / 60"). */
  counter?: string;
  counterTone?: CounterTone;
  /** Muted helper line under the control. */
  hint?: string;
  children: ReactNode;
}

/** One form row: label (+ counter), control, hint. */
export function SeoField({ label, counter, counterTone = "faint", hint, children }: SeoFieldProps) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={label ? id : undefined} className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-baseline gap-2">
          <span id={id} className="grow text-xs font-bold text-text-muted">
            {label}
          </span>
          {counter && <span className={cn("font-mono text-[11px]", COUNTER_TONE[counterTone])}>{counter}</span>}
        </div>
      )}
      {children}
      {hint && <span className="text-xs text-text-faint">{hint}</span>}
    </div>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  invalid?: boolean;
}

export function SeoTextInput({ label, value, onChange, placeholder, mono, invalid }: TextInputProps) {
  return (
    <label className={cn("flex min-h-11 items-center px-3", FIELD_BOX, invalid && "border-error-border")}>
      <span className={SR_ONLY}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={cn(
          "min-w-0 grow border-0 bg-transparent text-sm text-text outline-none placeholder:text-placeholder",
          mono && "font-mono",
        )}
      />
    </label>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** CSS height, e.g. "230px". */
  height?: string;
  mono?: boolean;
}

export function SeoTextArea({ label, value, onChange, placeholder, height = "160px", mono = true }: TextAreaProps) {
  return (
    <label className={cn("flex", FIELD_BOX)}>
      <span className={SR_ONLY}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        style={{ height }}
        className={cn(
          "box-border min-w-0 grow resize-y border-0 bg-transparent p-3 text-[13px] leading-[1.65] text-syntax-plain outline-none placeholder:text-placeholder",
          mono && "font-mono",
        )}
      />
    </label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}

export function SeoSelect<T extends string>({ label, value, onChange, options }: SelectProps<T>) {
  return (
    <label className={cn("flex min-h-11 items-center px-3", FIELD_BOX)}>
      <span className={SR_ONLY}>{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value);
          if (next) onChange(next.value);
        }}
        className="min-w-0 grow cursor-pointer border-0 bg-transparent text-sm text-text outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-text">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface TogglesProps<T extends string> {
  items: readonly { id: T; label: string; on: boolean }[];
  onToggle: (id: T) => void;
}

/** Grid of switch buttons (aria-pressed). */
export function SeoToggles<T extends string>({ items, onToggle }: TogglesProps<T>) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-1.5">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={t.on}
          onClick={() => onToggle(t.id)}
          className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-border px-3 text-left text-[13px] font-semibold text-text-key transition-colors hover:border-border-strong"
        >
          <span
            aria-hidden="true"
            className={cn(
              "relative inline-block h-5 w-[34px] shrink-0 rounded-full transition-colors",
              t.on ? "bg-accent" : "bg-[#3a3833]",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-text motion-safe:transition-[left]",
                t.on ? "left-4" : "left-0.5",
              )}
            />
          </span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export interface SeoRowColumn<K extends string> {
  key: K;
  /** Accessible label and placeholder. */
  label: string;
  /** CSS flex shorthand, e.g. "0 1 110px". */
  flex: string;
}

interface RowsProps<K extends string> {
  columns: readonly SeoRowColumn<K>[];
  rows: readonly Record<K, string>[];
  onChange: (rows: Record<K, string>[]) => void;
  /** Template for "+ Add …". */
  newRow: Record<K, string>;
  addLabel: string;
  /** Red border on a cell. */
  isBad?: (row: Record<K, string>, key: K, index: number) => boolean;
}

/** Editable rows of mono inputs with remove buttons and "+ Add …". */
export function SeoRows<K extends string>({ columns, rows, onChange, newRow, addLabel, isBad }: RowsProps<K>) {
  const edit = (ri: number, key: K, v: string) =>
    onChange(rows.map((r, i) => (i === ri ? { ...r, [key]: v } : r)));
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex flex-wrap items-center gap-1.5">
          {columns.map((c) => {
            const bad = isBad?.(row, c.key, ri) ?? false;
            return (
              <label
                key={c.key}
                style={{ flex: c.flex }}
                className={cn(
                  "flex min-h-[42px] min-w-0 items-center rounded-[9px] border bg-[#0d0d0c] px-2.5 transition-colors focus-within:border-clay-light/50",
                  bad ? "border-error-border" : "border-white/10",
                )}
              >
                <span className={SR_ONLY}>
                  {c.label}, row {ri + 1}
                </span>
                <input
                  type="text"
                  value={row[c.key]}
                  onChange={(e) => edit(ri, c.key, e.target.value)}
                  placeholder={c.label}
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={bad || undefined}
                  className="min-w-0 grow border-0 bg-transparent font-mono text-[13px] text-text outline-none placeholder:text-placeholder"
                />
              </label>
            );
          })}
          <button
            type="button"
            aria-label={`Remove row ${ri + 1}`}
            onClick={() => onChange(rows.filter((_, i) => i !== ri))}
            className="size-[42px] shrink-0 cursor-pointer rounded-[9px] border border-border text-base text-text-tertiary transition-colors hover:border-border-strong hover:text-text"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { ...newRow }])}
        className="min-h-10 cursor-pointer self-start rounded-[9px] border border-dashed border-white/18 px-3 text-[13px] font-semibold text-text-key transition-colors hover:border-border-strong hover:text-text"
      >
        + {addLabel}
      </button>
    </div>
  );
}
