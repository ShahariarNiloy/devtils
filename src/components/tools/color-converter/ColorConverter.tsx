"use client";

import { useMemo, useState } from "react";
import { Copy, Pipette } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/primitives/Input";
import { Badge } from "@/components/primitives/Badge";
import { Button } from "@/components/primitives/Button";
import { ToolShell } from "@/components/layout/ToolShell";
import {
  contrastRatio,
  hslToString,
  hsbToString,
  nearestTailwind,
  oklchToString,
  parseHex,
  parseHsl,
  parseHsb,
  parseOklch,
  parseRgb,
  rgbToHex,
  rgbToHsb,
  rgbToHsl,
  rgbToOklch,
  rgbToString,
  type RGB,
} from "./color.lib";
import type { Tool } from "@/lib/tools-registry";
import { cn } from "@/lib/cn";

type Format = "hex" | "rgb" | "hsl" | "oklch" | "hsb";

const labels: Record<Format, string> = {
  hex: "HEX",
  rgb: "RGB",
  hsl: "HSL",
  oklch: "OKLCH",
  hsb: "HSB",
};

export function ColorConverter({ tool }: { tool: Tool }) {
  const [rgb, setRgb] = useState<RGB>({ r: 212, g: 255, b: 79, a: 1 });
  const [bgRgb, setBgRgb] = useState<RGB>({ r: 14, g: 14, b: 12, a: 1 });

  const formatted = useMemo(
    () => ({
      hex: rgbToHex(rgb),
      rgb: rgbToString(rgb),
      hsl: hslToString(rgbToHsl(rgb)),
      oklch: oklchToString(rgbToOklch(rgb)),
      hsb: hsbToString(rgbToHsb(rgb)),
    }),
    [rgb],
  );

  const ratio = useMemo(() => contrastRatio(rgb, bgRgb), [rgb, bgRgb]);
  const tailwind = useMemo(() => nearestTailwind(rgb), [rgb]);
  const previewHex = formatted.hex;
  const bgHex = useMemo(() => rgbToHex(bgRgb), [bgRgb]);

  const onCopy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`Copied ${label}`);
  };

  const update = (input: string, format: Format) => {
    let parsed: RGB | null = null;
    if (format === "hex") parsed = parseHex(input);
    else if (format === "rgb") parsed = parseRgb(input);
    else if (format === "hsl") parsed = parseHsl(input);
    else if (format === "oklch") parsed = parseOklch(input);
    else if (format === "hsb") parsed = parseHsb(input);
    if (parsed) setRgb(parsed);
  };

  const aaPass = ratio >= 4.5;
  const aaaPass = ratio >= 7;
  const largePass = ratio >= 3;

  return (
    <ToolShell
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={() => onCopy("HEX", formatted.hex)}>
            <Copy size={13} />
            Copy HEX
          </Button>
          <span className="ml-auto text-xs text-text-muted">
            Tailwind nearest:{" "}
            <code className="font-mono text-text">{tailwind.name}</code>
          </span>
        </>
      }
    >
      <div
        className="relative h-45 rounded-xl overflow-hidden border border-border-subtle"
        style={{ background: previewHex }}
      >
        <div className="absolute inset-0 flex items-end justify-between p-4">
          <span
            className="font-mono text-sm tracking-tight"
            style={{ color: ratio >= 3 ? bgHex : previewHex }}
          >
            {previewHex.toUpperCase()}
          </span>
          <span
            className="rounded-md bg-bg/30 backdrop-blur-md px-2 py-1 text-xs font-mono text-text border border-text/10"
          >
            preview
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-3 h-9 border-b border-border-subtle">
            <span className="text-xs uppercase tracking-wider text-text-faint">Values</span>
            <label className="inline-flex items-center gap-2 text-xs text-text-muted cursor-pointer">
              <Pipette size={12} />
              Picker
              <input
                type="color"
                value={previewHex.length === 9 ? previewHex.slice(0, 7) : previewHex}
                onChange={(e) => {
                  const parsed = parseHex(e.target.value);
                  if (parsed) setRgb({ ...parsed, a: rgb.a });
                }}
                className="h-6 w-8 rounded cursor-pointer bg-transparent border border-border"
              />
            </label>
          </div>
          <div className="divide-y divide-border-subtle">
            {(Object.keys(labels) as Format[]).map((fmt) => (
              <div key={fmt} className="flex items-center gap-3 px-3 py-2">
                <span className="w-14 text-xs uppercase tracking-wider text-text-faint">
                  {labels[fmt]}
                </span>
                <Input
                  value={formatted[fmt]}
                  onChange={(e) => update(e.target.value, fmt)}
                  className="flex-1 h-8 font-mono text-xs"
                  aria-label={`${labels[fmt]} value`}
                />
                <button
                  type="button"
                  onClick={() => onCopy(labels[fmt], formatted[fmt])}
                  aria-label={`Copy ${labels[fmt]}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text"
                >
                  <Copy size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
          <div className="px-3 h-9 border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-text-faint">
              WCAG Contrast
            </span>
            <span className="font-mono text-sm text-text">{ratio.toFixed(2)}:1</span>
          </div>
          <div className="p-3 space-y-3">
            <label className="flex items-center gap-3">
              <span className="w-14 text-xs uppercase tracking-wider text-text-faint">
                Against
              </span>
              <Input
                value={bgHex}
                onChange={(e) => {
                  const parsed = parseHex(e.target.value);
                  if (parsed) setBgRgb(parsed);
                }}
                className="flex-1 h-8 font-mono text-xs"
                aria-label="Comparison background color"
              />
              <input
                type="color"
                value={bgHex.length === 9 ? bgHex.slice(0, 7) : bgHex}
                onChange={(e) => {
                  const parsed = parseHex(e.target.value);
                  if (parsed) setBgRgb({ ...parsed, a: 1 });
                }}
                className="h-7 w-9 rounded border border-border cursor-pointer"
                aria-label="Pick background color"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <ContrastBadge label="AA" passes={aaPass} hint="4.5+" />
              <ContrastBadge label="AAA" passes={aaaPass} hint="7+" />
              <ContrastBadge label="Large" passes={largePass} hint="3+" />
            </div>

            <div
              className="rounded-lg border border-border-subtle p-3"
              style={{ background: bgHex, color: previewHex }}
            >
              <p
                className="text-lg font-medium leading-tight"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                The quick brown fox.
              </p>
              <p className="text-xs mt-1 opacity-80">Sample text on chosen background.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}

function ContrastBadge({ label, passes, hint }: { label: string; passes: boolean; hint: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2 flex flex-col items-center gap-0.5 text-center",
        passes
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-surface-soft text-text-faint",
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      <Badge variant={passes ? "success" : "neutral"}>{passes ? "Pass" : "Fail"}</Badge>
      <span className="text-2xs text-text-faint mt-0.5">{hint}</span>
    </div>
  );
}
