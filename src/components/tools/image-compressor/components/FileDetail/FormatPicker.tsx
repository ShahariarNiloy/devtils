"use client";

import { cn } from "@/lib/cn";
import {
  DECODE_ONLY_INPUT_MIME_TYPES,
  MIME_LABEL,
  OUTPUT_FORMATS,
  OUTPUT_FORMAT_LABEL,
} from "../../image-compressor.constants";
import type { OutputFormat } from "../../image-compressor.types";

// ── Format pills (5 options in a bordered tray) ─────────────────

/** Sub-copy under the Format picker. Spelled out (not a nested ternary)
 *  so the decode-only case — where "auto" really means JPEG — reads
 *  honestly instead of claiming the output matches the source. */
export function formatDescription(
  outputFormat: OutputFormat,
  inputMime: string
): string {
  if (outputFormat !== "auto") {
    return "Converting format. May lose transparency or color profile.";
  }
  if (DECODE_ONLY_INPUT_MIME_TYPES.has(inputMime)) {
    const label = MIME_LABEL[inputMime] ?? "This format";
    return `${label} can't be re-encoded on the web — saved as JPEG.`;
  }
  return `Same as source (${MIME_LABEL[inputMime] ?? "image"}).`;
}

export function FormatPicker({
  value,
  inputMime,
  onChange,
}: {
  value: OutputFormat;
  inputMime: string;
  onChange: (m: OutputFormat) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1.5">
      {OUTPUT_FORMATS.map((m) => {
        const active = value === m;
        // Disable converting to the same format as input — pointless;
        // user should pick "Auto" instead.
        const redundant = m !== "auto" && m === inputMime;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={redundant}
            title={
              redundant
                ? "Same as source — pick Auto instead"
                : OUTPUT_FORMAT_LABEL[m]
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!redundant) onChange(m);
            }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out-strong",
              redundant &&
                "cursor-not-allowed border-border-subtle bg-surface opacity-40",
              !redundant && "active:scale-[0.97] cursor-pointer",
              active
                ? "border-brand bg-brand/15 text-text"
                : !redundant &&
                    "border-border-subtle bg-surface text-text-muted hover:border-border-strong/60 hover:text-text"
            )}
          >
            {OUTPUT_FORMAT_LABEL[m]}
          </button>
        );
      })}
    </div>
  );
}
