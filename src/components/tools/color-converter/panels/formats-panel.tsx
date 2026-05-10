"use client";

import { useState } from "react";
import { Copy, Blend, Check } from "lucide-react";
import { toast } from "sonner";
import type { RGB } from "../color.lib";
import { parseAnyColor, parseFormatInput } from "../color-converter.lib";
import { FORMATS, FORMAT_LABEL, type Format } from "../color-converter.types";
import { cn } from "@/lib/cn";

interface Props {
  formatted: Record<Format, string>;
  currentHex: string;
  onColorParsed: (rgb: RGB) => void;
}

export function FormatsPanel({ formatted, currentHex, onColorParsed }: Props) {
  const [anyVal, setAnyVal] = useState("");
  const [anyState, setAnyState] = useState<"idle" | "valid" | "invalid">("idle");
  const [fmtEdits, setFmtEdits] = useState<Partial<Record<Format, string>>>({});
  const [fmtInvalid, setFmtInvalid] = useState<Partial<Record<Format, boolean>>>({});

  const handleAnyChange = (val: string) => {
    setAnyVal(val);
    if (!val.trim()) { setAnyState("idle"); return; }
    const parsed = parseAnyColor(val);
    if (parsed) {
      setAnyState("valid");
      onColorParsed(parsed);
      setFmtEdits({});
      setFmtInvalid({});
    } else {
      setAnyState("invalid");
    }
  };

  const handleAnyBlur = () => { setAnyVal(""); setAnyState("idle"); };

  const handleFmtFocus = (fmt: Format) => {
    setFmtEdits((prev) => ({ ...prev, [fmt]: formatted[fmt] }));
  };

  const handleFmtChange = (fmt: Format, val: string) => {
    setFmtEdits((prev) => ({ ...prev, [fmt]: val }));
    const parsed = parseFormatInput(val, fmt);
    if (parsed) {
      onColorParsed(parsed);
      setAnyVal(""); setAnyState("idle");
      setFmtInvalid((prev) => { const n = { ...prev }; delete n[fmt]; return n; });
    } else {
      setFmtInvalid((prev) => ({ ...prev, [fmt]: true }));
    }
  };

  const handleFmtBlur = (fmt: Format) => {
    setFmtEdits((prev) => { const n = { ...prev }; delete n[fmt]; return n; });
    setFmtInvalid((prev) => { const n = { ...prev }; delete n[fmt]; return n; });
  };

  const copyFmt = async (fmt: Format) => {
    await navigator.clipboard.writeText(formatted[fmt]);
    toast.success(`Copied ${FORMAT_LABEL[fmt]}`);
  };

  return (
    <div className="flex flex-col gap-3">

      {/* ── Hero universal input ──────────────────────────── */}
      <div
        className={cn(
          "rounded-xl border-2 bg-surface overflow-hidden transition-colors duration-200",
          anyState === "valid"   && "border-success/50",
          anyState === "invalid" && "border-danger/40",
          anyState === "idle"    && "border-brand/25 focus-within:border-brand/55",
        )}
      >
        <div className="px-4 pt-3.5 pb-2.5 border-b border-border-subtle/60 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text leading-none">Enter any color</p>
            <p className="text-sm text-text-faint mt-1 leading-snug">
              Hex · RGB · HSL · OKLCH · color name — any format
            </p>
          </div>
          {anyState === "valid" && (
            <div
              className="shrink-0 h-8 w-8 rounded-lg border border-black/10 mt-0.5"
              style={{ background: currentHex }}
            />
          )}
        </div>
        <div className="relative flex items-center gap-2 px-4 py-3">
          <div className="shrink-0 pointer-events-none">
            {anyState === "valid"
              ? <Check size={15} className="text-success" />
              : <Blend size={15} className={cn(anyState === "invalid" ? "text-danger/60" : "text-text-faint/50")} />}
          </div>
          <input
            value={anyVal}
            onChange={(e) => handleAnyChange(e.target.value)}
            onBlur={handleAnyBlur}
            spellCheck={false}
            placeholder="#3b82f6  ·  59, 130, 246  ·  hsl(217 91% 60%)  ·  royalblue"
            className={cn(
              "flex-1 bg-transparent font-mono text-sm outline-none leading-none py-0.5",
              "placeholder:text-text-faint/45 placeholder:font-sans",
              anyState === "invalid" && "text-danger",
            )}
            aria-label="Paste any color format"
          />
        </div>
      </div>

      {/* ── Format grid ──────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border-subtle">
          <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
            Color Formats
          </span>
        </div>

        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FORMATS.map((fmt) => {
            const isEditing = fmt in fmtEdits;
            const isInvalid = !!fmtInvalid[fmt];
            const displayVal = fmtEdits[fmt] ?? formatted[fmt];
            return (
              <div
                key={fmt}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-2.5 transition-colors",
                  isInvalid
                    ? "border-danger/40 bg-danger/5"
                    : isEditing
                      ? "border-brand/35 bg-brand/5"
                      : "border-border-subtle hover:border-border",
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold uppercase tracking-wider text-text-faint">
                    {FORMAT_LABEL[fmt]}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyFmt(fmt)}
                    className="text-text-faint hover:text-text transition-colors cursor-pointer"
                    aria-label={`Copy ${FORMAT_LABEL[fmt]}`}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <input
                  value={displayVal}
                  onFocus={() => handleFmtFocus(fmt)}
                  onChange={(e) => handleFmtChange(fmt, e.target.value)}
                  onBlur={() => handleFmtBlur(fmt)}
                  spellCheck={false}
                  className={cn(
                    "font-mono text-sm bg-transparent outline-none w-full leading-snug",
                    isInvalid ? "text-danger" : "text-text",
                  )}
                  aria-label={`${FORMAT_LABEL[fmt]} value`}
                />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
