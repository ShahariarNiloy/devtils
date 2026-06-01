"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { diffLines } from "@/lib/diff";
import {
  bulkRewrite,
  detectBaseFontSize,
  LENGTH_UNITS,
  SPACING_PROPERTIES,
  TYPOGRAPHY_PROPERTIES,
  type BulkScope,
  type ConversionContext,
  type LengthUnit,
} from "../css-unit-converter.lib";

const BULK_SCOPE_PRESETS = [
  { id: "all", label: "All properties" },
  { id: "spacing", label: "Spacing + sizing", properties: SPACING_PROPERTIES },
  { id: "typography", label: "Typography only", properties: TYPOGRAPHY_PROPERTIES },
] as const;

type BulkScopeId = (typeof BULK_SCOPE_PRESETS)[number]["id"];

const SAMPLE_CSS = `:root {
  font-size: 16px;
}

.card {
  padding: 16px 24px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  line-height: 24px;
}

@media (min-width: 768px) {
  .card {
    padding: 24px 32px;
    font-size: 16px;
  }
}`;

/**
 * Bulk CSS panel — paste a stylesheet, swap a unit pair across declarations
 * (with optional property scope and hairline preservation), see the result
 * side-by-side. Auto-detects a `:root` font-size in the input and offers to
 * sync the shared base to it.
 */
export function BulkPanel({
  ctx,
  onSetBase,
}: {
  ctx: ConversionContext;
  onSetBase: (n: number) => void;
}) {
  const [css, setCss] = useState(SAMPLE_CSS);
  const [from, setFrom] = useState<LengthUnit>("px");
  const [to, setTo] = useState<LengthUnit>("rem");
  const [scopeId, setScopeId] = useState<BulkScopeId>("all");
  const [preserveHairlines, setPreserveHairlines] = useState(true);

  const scope: BulkScope = useMemo(() => {
    const preset = BULK_SCOPE_PRESETS.find((p) => p.id === scopeId);
    if (!preset || preset.id === "all") return { kind: "all" };
    return { kind: "include", properties: preset.properties };
  }, [scopeId]);

  const result = useMemo(
    () => bulkRewrite(css, { from, to, scope, ctx, preserveHairlines }),
    [css, from, to, scope, ctx, preserveHairlines],
  );

  const changedLines = useMemo(() => {
    const ops = diffLines(css, result.output);
    return ops.filter((o) => o.kind !== "equal").length;
  }, [css, result.output]);

  const detected = useMemo(() => detectBaseFontSize(css), [css]);
  const detectedBaseDiffers =
    detected.base !== null && detected.base !== ctx.baseFontSize;

  const copyOutput = useCallback(() => {
    void navigator.clipboard.writeText(result.output);
    toast.success("Converted CSS copied");
  }, [result.output]);

  const reset = useCallback(() => {
    setCss(SAMPLE_CSS);
    setFrom("px");
    setTo("rem");
    setScopeId("all");
    setPreserveHairlines(true);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {detectedBaseDiffers && (
        <div className="flex items-center gap-3 rounded-xl border border-info-border bg-info-bg px-4 py-2.5 text-xs-plus text-info-text">
          <Sparkles size={14} className="shrink-0 text-info" />
          <span className="flex-1">
            This CSS declares{" "}
            <code className="font-mono">{detected.base}px</code> as the root
            font-size
            {detected.source === "root-percent" && " (via 62.5%)"}, but
            you&apos;re converting at{" "}
            <code className="font-mono">{ctx.baseFontSize}px</code>.
          </span>
          <button
            type="button"
            onClick={() => detected.base !== null && onSetBase(detected.base)}
            className="inline-flex h-7 items-center rounded-md border border-info-border bg-info px-2.5 text-xs-plus font-medium text-text-on-sage transition-opacity hover:opacity-90"
          >
            Use {detected.base}px
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-3 py-2">
          <div className="flex items-center gap-1.5 font-mono text-sm">
            <UnitPill value={from} onChange={setFrom} />
            <span className="text-text-faint">→</span>
            <UnitPill value={to} onChange={setTo} />
          </div>

          <span className="text-text-faint">·</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs-plus text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                {BULK_SCOPE_PRESETS.find((p) => p.id === scopeId)?.label}
                <ChevronDown size={12} className="text-text-faint" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Convert which properties</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {BULK_SCOPE_PRESETS.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setScopeId(p.id)}>
                  {scopeId === p.id ? <Check size={12} /> : <span className="w-3" />}
                  <span className="ml-1.5">{p.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <label className="flex items-center gap-1.5 text-xs-plus text-text-muted">
            <input
              type="checkbox"
              checked={preserveHairlines}
              onChange={(e) => setPreserveHairlines(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-brand"
            />
            keep 1px
          </label>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs-plus text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <button
              type="button"
              onClick={copyOutput}
              disabled={result.replaced === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs-plus font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>

        {/* Editors */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          <textarea
            value={css}
            onChange={(e) => setCss(e.target.value)}
            spellCheck={false}
            className="block h-[460px] w-full resize-none bg-transparent p-4 font-mono text-[12.5px] leading-[1.65] text-text outline-none placeholder:text-text-faint"
            placeholder="Paste CSS here…"
          />
          <pre className="block h-[460px] w-full overflow-auto border-t border-border-subtle bg-surface-2/30 p-4 font-mono text-[12.5px] leading-[1.65] text-text md:border-l md:border-t-0">
            {result.output}
          </pre>
        </div>

        {/* Footer status */}
        <div className="flex items-center justify-between border-t border-border-subtle bg-surface-2/40 px-4 py-2 text-xs text-text-muted">
          <span>
            {result.replaced === 0 ? (
              <span className="text-text-faint">no changes</span>
            ) : (
              <>
                <span className="font-mono text-text">{result.replaced}</span>{" "}
                replacement{result.replaced === 1 ? "" : "s"} ·{" "}
                <span className="font-mono text-text">{changedLines}</span> line
                {changedLines === 1 ? "" : "s"} touched
              </>
            )}
          </span>
          {result.touchedProperties.length > 0 && (
            <span className="truncate text-xs text-text-faint">
              {result.touchedProperties.slice(0, 4).join(" · ")}
              {result.touchedProperties.length > 4 &&
                ` +${result.touchedProperties.length - 4}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact pill-style unit dropdown for the bulk controls row. */
function UnitPill({
  value,
  onChange,
}: {
  value: LengthUnit;
  onChange: (u: LengthUnit) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 font-mono text-sm text-text transition-colors hover:bg-surface"
        >
          {value}
          <ChevronDown size={11} className="text-text-faint" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {LENGTH_UNITS.map((u) => (
          <DropdownMenuItem key={u} onClick={() => onChange(u)}>
            {value === u ? <Check size={12} /> : <span className="w-3" />}
            <span className="ml-1.5 font-mono">{u}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
