"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { rgbToHex } from "../color.lib";
import {
  FORMATS,
  FORMAT_LABEL,
  type Format,
  type TailwindMatch,
} from "../color-converter.types";

interface Props {
  formatted: Record<Format, string>;
  primaryFormat: Format;
  tailwind: TailwindMatch;
}

const SUB_LABEL: Partial<Record<Format, string>> = {
  hex: "recommended for CSS",
  oklch: "perceptually uniform",
  lab: "CIE 1976",
  lch: "polar Lab",
  named: "closest CSS name",
};

export function FormatsPanel({ formatted, primaryFormat, tailwind }: Props) {
  const [copied, setCopied] = useState<Format | null>(null);

  const copyFmt = async (fmt: Format) => {
    await navigator.clipboard.writeText(formatted[fmt]);
    setCopied(fmt);
    toast.success(`Copied ${FORMAT_LABEL[fmt]}`);
    window.setTimeout(() => setCopied((c) => (c === fmt ? null : c)), 1200);
  };

  const copyTailwind = async () => {
    await navigator.clipboard.writeText(`bg-${tailwind.name}`);
    toast.success(`Copied bg-${tailwind.name}`);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5">
        <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
          All color formats
        </span>
        <span className="text-[11px] text-text-muted">Click any tile to copy</span>
      </div>

      <div className="grid flex-1 grid-cols-2 sm:grid-cols-3 gap-2 p-3 grid-rows-[repeat(5,1fr)_auto] sm:grid-rows-[repeat(3,1fr)_auto]">
        {FORMATS.map((fmt) => {
          const isActive = fmt === primaryFormat;
          const justCopied = copied === fmt;
          return (
            <button
              key={fmt}
              type="button"
              onClick={() => copyFmt(fmt)}
              aria-label={`Copy ${FORMAT_LABEL[fmt]} value`}
              className={cn(
                "group relative flex h-full min-h-[100px] flex-col gap-2 rounded-lg border bg-bg p-3 text-left transition-all cursor-pointer",
                isActive
                  ? "border-brand/55 ring-1 ring-brand/30"
                  : "border-border-subtle hover:border-border-strong/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint">
                  {FORMAT_LABEL[fmt]}
                </span>
                <span
                  className={cn(
                    "text-text-faint transition-opacity",
                    justCopied ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                  aria-hidden
                >
                  {justCopied ? <Check size={13} /> : <Copy size={13} />}
                </span>
              </div>
              <div className="font-mono text-[13px] font-semibold leading-snug text-text break-all">
                {formatted[fmt]}
              </div>
              {SUB_LABEL[fmt] && (
                <div className="mt-auto text-[11px] text-text-muted">
                  {SUB_LABEL[fmt]}
                </div>
              )}
            </button>
          );
        })}

        {/* ── Tailwind tile (spans all columns) ─────────── */}
        <button
          type="button"
          onClick={copyTailwind}
          aria-label={`Copy bg-${tailwind.name}`}
          className="group relative col-span-2 sm:col-span-3 flex items-center gap-3 rounded-lg border border-border-subtle bg-bg p-3 text-left transition-all hover:border-border-strong/60 cursor-pointer"
          title={`Copy bg-${tailwind.name}`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint shrink-0">
            Tailwind Nearest
          </span>
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-sm border border-black/10"
            style={{ background: rgbToHex(tailwind.swatch) }}
          />
          <span className="font-mono text-[13px] font-semibold text-text">
            {tailwind.name}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
            <Copy size={11} aria-hidden />
            <span className="font-mono">bg-{tailwind.name}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
