"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { rgbToHex, type RGB } from "../color.lib";
import {
  contrastGrade,
  type ContrastSummary,
  type FormatRow,
  type ScaleStep,
} from "../color-converter.lib";

/** "Copy" → "Copied" for a moment after a click (mockup button label). */
export function useCopiedLabel() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = useCallback((key: string, text: string) => {
    void navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(key);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1400);
  }, []);
  return { copied, copy };
}

const rgba = ({ r, g, b, a }: RGB) =>
  `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${a})`;

// ── Left column: swatch, field, contrast ───────────────────────────

interface SwatchColumnProps {
  rgb: RGB;
  hexUpper: string;
  contrast: ContrastSummary;
  inputValue: string;
  invalid: boolean;
  onInput: (v: string) => void;
  onCommit: () => void;
  onPick: (hex: string) => void;
  onPickDone: () => void;
  menu: React.ReactNode;
}

export const SwatchColumn = forwardRef<HTMLInputElement, SwatchColumnProps>(function SwatchColumn(
  { rgb, hexUpper, contrast, inputValue, invalid, onInput, onCommit, onPick, onPickDone, menu },
  ref,
) {
  const solidHex = rgbToHex({ ...rgb, a: 1 });
  const dark = contrast.bestText === "dark";
  const fill = rgba(rgb);
  // Translucent colours sit on a checkerboard so the alpha is visible.
  const swatchBg =
    rgb.a < 1
      ? `linear-gradient(${fill}, ${fill}), repeating-conic-gradient(#2a2a27 0 25%, #1c1c1a 0 50%) 0 0 / 16px 16px`
      : fill;

  return (
    <div className="flex min-w-0 flex-col gap-3.5 border-b border-border-subtle p-4 md:flex-[1_1_340px] md:border-r md:border-b-0">
      <div
        className="flex h-[220px] flex-col justify-end gap-0.5 rounded-[14px] border border-white/10 p-4"
        style={{ background: swatchBg }}
      >
        <span className={cn("text-[26px] font-bold tracking-[-0.02em]", dark ? "text-charcoal" : "text-text")}>
          Aa {hexUpper}
        </span>
        <span className={cn("text-[13px]", dark ? "text-charcoal" : "text-text")}>
          {dark ? "Dark text reads best on this" : "Light text reads best on this"}
        </span>
      </div>

      <div className="flex gap-2">
        <label
          className={cn(
            "flex min-h-[46px] min-w-0 grow items-center gap-2 rounded-[11px] border bg-[#0d0d0c] px-3 transition-colors focus-within:border-clay-light/50",
            invalid ? "border-error-border" : "border-white/10",
          )}
        >
          <span className="sr-only">Colour value</span>
          <input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={(e) => onInput(e.target.value)}
            onBlur={onCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommit();
            }}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid}
            placeholder="#C58E5E, rgb(197 142 94)…"
            className="min-w-0 grow border-0 bg-transparent font-mono text-[15px] text-text outline-none placeholder:text-placeholder"
          />
        </label>
        <label className="relative size-[46px] shrink-0 cursor-pointer overflow-hidden rounded-[11px] border border-white/12">
          <span className="sr-only">Pick a colour</span>
          <input
            type="color"
            value={solidHex}
            onChange={(e) => onPick(e.target.value)}
            onBlur={onPickDone}
            className="absolute -inset-2 h-[62px] w-[62px] cursor-pointer border-0 p-0"
          />
        </label>
        {menu}
      </div>

      {invalid && (
        <span role="status" className="text-[13px] text-error-text">
          Couldn&rsquo;t read that. Try a hex like #C58E5E or rgb(197 142 94).
        </span>
      )}

      <div className="grid grid-cols-2 gap-2">
        <ContrastCard ratio={contrast.onWhite} against="white" hex={hexUpper} />
        <ContrastCard ratio={contrast.onBlack} against="black" hex={hexUpper} />
      </div>
    </div>
  );
});

function ContrastCard({ ratio, against, hex }: { ratio: number; against: "white" | "black"; hex: string }) {
  const grade = contrastGrade(ratio);
  return (
    <div className="surface-panel flex items-center gap-2.5 rounded-[11px] px-3 py-2.5">
      <span
        aria-hidden
        className={cn(
          "flex size-[30px] shrink-0 items-center justify-center rounded-lg text-[13px] font-bold",
          against === "white" ? "bg-white" : "border border-white/10 bg-black",
        )}
        style={{ color: hex }}
      >
        Aa
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] font-bold">{ratio.toFixed(2)}:1</span>
        <span className={cn("text-[11px]", grade === "fails" ? "text-error-text" : "text-text-faint")}>
          on {against} · {grade}
        </span>
      </span>
    </div>
  );
}

// ── Right column: formats + scale ──────────────────────────────────

interface FormatsColumnProps {
  rows: FormatRow[];
  scale: ScaleStep[];
  onUseStep: (hex: string) => void;
}

export function FormatsColumn({ rows, scale, onUseStep }: FormatsColumnProps) {
  const { copied, copy } = useCopiedLabel();
  return (
    <div className="flex min-w-0 flex-col md:flex-[1_1_380px]">
      <div className="p-2">
        {rows.map((f) => (
          <div key={f.key} className="flex min-h-[54px] items-center gap-3 border-b border-white/5 py-1 pr-2 pl-3">
            <span className="shrink-0 basis-14 text-xs font-bold text-text-faint">{f.key}</span>
            <span className="min-w-0 grow font-mono text-[12.5px] break-all text-text sm:text-[13px]">{f.value}</span>
            <button
              type="button"
              aria-label={`Copy ${f.key}`}
              onClick={() => copy(f.key, f.value)}
              className="h-10 min-w-11 shrink-0 rounded-[9px] border border-border px-2.5 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
            >
              {copied === f.key ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-auto border-t border-border-subtle px-4 pt-3.5 pb-4">
        <div className="mb-2.5 text-xs text-text-faint">Tints and shades · click to use</div>
        <div className="grid grid-cols-9 gap-1">
          {scale.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Use ${s.hex}`}
              title={s.hex}
              onClick={() => onUseStep(s.hex)}
              className={cn(
                "h-12 min-w-0 cursor-pointer rounded-lg transition-transform duration-150 hover:-translate-y-0.5",
                s.base ? "border-2 border-text" : "border border-border",
              )}
              style={{ background: s.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ⋯ menu: everything the mockup doesn't draw ─────────────────────

export type ColorExtra = "picker" | "formats" | "contrast" | "ramp" | "recent";

const EXTRAS: { id: ColorExtra; label: string }[] = [
  { id: "picker", label: "Fine-tune picker & alpha" },
  { id: "formats", label: "More formats (HSB, CMYK, LAB, LCH, name, Tailwind)" },
  { id: "contrast", label: "Contrast on any background" },
  { id: "ramp", label: "50–900 ramp" },
  { id: "recent", label: "Recent colours" },
];

interface MoreMenuProps {
  open: ReadonlySet<ColorExtra>;
  onToggle: (id: ColorExtra) => void;
  onCopyAll: () => void;
  onCopyPermalink: () => void;
}

export function MoreMenu({ open, onToggle, onCopyAll, onCopyPermalink }: MoreMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More colour tools"
          className="flex size-[46px] shrink-0 items-center justify-center rounded-[11px] border border-white/10 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
        >
          <MoreHorizontal size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel>Show</DropdownMenuLabel>
        {EXTRAS.map((x) => (
          <DropdownMenuCheckboxItem
            key={x.id}
            checked={open.has(x.id)}
            onCheckedChange={() => onToggle(x.id)}
            onSelect={(e) => e.preventDefault()}
          >
            {x.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCopyAll}>Copy all formats</DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyPermalink}>
          Copy permalink
          <span className="ml-auto pl-4 font-mono text-[10px] text-text-faint">⌘L</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
