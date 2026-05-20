"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Check, ChevronDown, Command, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RGB } from "../color.lib";
import { parseAnyColor, parseFormatInput } from "../color-converter.lib";
import {
  FORMATS,
  FORMAT_LABEL,
  type Format,
  type NamedMatch,
} from "../color-converter.types";

interface Props {
  formatted: Record<Format, string>;
  primaryFormat: Format;
  onPrimaryFormatChange: (f: Format) => void;
  named: NamedMatch;
  onColorParsed: (rgb: RGB) => void;
  onCopyAll: () => void;
}

export interface HeroCardHandle {
  focus: () => void;
}

export const HeroCard = forwardRef<HeroCardHandle, Props>(function HeroCard(
  {
    formatted,
    primaryFormat,
    onPrimaryFormatChange,
    named,
    onColorParsed,
    onCopyAll,
  },
  ref,
) {
  const [edit, setEdit] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const displayValue = edit !== null ? edit : formatted[primaryFormat];

  const handleChange = (val: string) => {
    setEdit(val);
    const parsed = parseFormatInput(val, primaryFormat) ?? parseAnyColor(val);
    if (parsed) {
      setInvalid(false);
      onColorParsed(parsed);
    } else {
      setInvalid(true);
    }
  };

  const handleBlur = () => {
    setEdit(null);
    setInvalid(false);
  };

  const hex = formatted.hex;
  const swatchHex = hex.length === 9 ? hex.slice(0, 7) : hex;

  return (
    <section className="flex flex-col items-stretch gap-3">
      {/* eyebrow — supported input formats */}
      <p className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-1.5 text-[11px] uppercase tracking-[0.18em] text-text-muted">
        <Sparkles size={11} aria-hidden className="text-brand" />
        Paste any color
        <span aria-hidden className="text-text-muted/50">—</span>
        <span className="font-mono normal-case tracking-normal">HEX · RGB · HSL · OKLCH · CMYK · LAB · LCH · or a CSS name</span>
      </p>

      {/* hero pill */}
      <div
        className={cn(
          "mx-auto w-full max-w-3xl rounded-2xl border bg-surface shadow-sm transition-colors",
          invalid
            ? "border-danger/40"
            : "border-border focus-within:border-brand/55",
        )}
      >
        <div className="flex items-stretch gap-4 px-4 py-4 sm:px-5">
          <div
            className="h-14 w-14 shrink-0 rounded-xl border border-black/10 shadow-inner"
            style={{ background: swatchHex }}
            aria-hidden
          />

          <input
            ref={inputRef}
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={(e) => e.currentTarget.select()}
            spellCheck={false}
            className={cn(
              "min-w-0 flex-1 bg-transparent font-mono text-xl sm:text-2xl font-semibold tracking-tight outline-none",
              invalid ? "text-danger" : "text-text",
            )}
            aria-label="Primary color value"
          />

          <div ref={menuRef} className="relative shrink-0 self-center">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-subtle bg-surface-soft px-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-bg hover:text-text cursor-pointer"
            >
              <Sparkles size={11} aria-hidden className="text-brand" />
              {FORMAT_LABEL[primaryFormat]}
              <ChevronDown size={12} aria-hidden />
            </button>
            {open && (
              <ul
                role="listbox"
                className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-card"
              >
                {FORMATS.map((f) => (
                  <li key={f}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={f === primaryFormat}
                      onClick={() => {
                        onPrimaryFormatChange(f);
                        setEdit(null);
                        setInvalid(false);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-soft cursor-pointer",
                        f === primaryFormat ? "text-text" : "text-text-muted",
                      )}
                    >
                      <span>{FORMAT_LABEL[f]}</span>
                      {f === primaryFormat && <Check size={13} aria-hidden />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom band — on canvas, outside the card ─────── */}
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-1">
        <button
          type="button"
          onClick={() => onPrimaryFormatChange("named")}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-sm shadow-sm transition-colors hover:bg-surface-soft cursor-pointer"
          title="Set primary format to NAMED"
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full border border-black/10"
            style={{ background: named.hex }}
          />
          <span className="text-text-muted">Closest:</span>
          <span className="font-medium text-text">
            {named.exact ? named.display : `~ ${named.display}`}
          </span>
        </button>

        <span className="text-[12px] text-text-muted">
          Click chip to override format
        </span>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onCopyAll}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text cursor-pointer"
          >
            <Copy size={13} aria-hidden />
            Copy all
          </button>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border-subtle bg-surface px-1.5 py-0.5 font-mono">
              <Command size={10} aria-hidden /> K
            </kbd>
            focus
          </span>
        </div>
      </div>
    </section>
  );
});
