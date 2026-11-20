"use client";

import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { dollarPath, inlineDisplay, type DiffEntry, type DiffResult } from "../json-diff.lib";
import type { PointerStyle } from "../use-json-diff";

/**
 * v2 change list: one tinted row per difference, in document order —
 * sign tile, path (click to copy), kind, then old → new values. Type
 * changes keep the "changed" tint but call out the type shift in warning
 * colour; moves show their from → to indices.
 */

const LOOK: Record<DiffEntry["kind"], { sign: string; bg: string; tone: string }> = {
  added: { sign: "+", bg: "bg-success/14", tone: "text-success-text" },
  removed: { sign: "−", bg: "bg-error/14", tone: "text-error-text" },
  changed: { sign: "~", bg: "bg-clay-light/14", tone: "text-clay-cream" },
  type: { sign: "~", bg: "bg-clay-light/14", tone: "text-warning-text" },
  moved: { sign: "↕", bg: "bg-info/14", tone: "text-info-text" },
};

const PREVIEW = 48;

export function ResultTree({
  result,
  pointerStyle,
  waiting,
}: {
  result: DiffResult | null;
  pointerStyle: PointerStyle;
  /** Both sides parse but at least one is empty. */
  waiting: boolean;
}) {
  if (!result) {
    return waiting ? (
      <p className="m-0 px-4 py-10 text-center text-[13px] text-text-faint">Paste JSON on both sides to compare.</p>
    ) : (
      <div className="min-h-40" />
    );
  }

  return (
    <div className="flex min-h-40 flex-col gap-1.5 p-3">
      {result.entries.length === 0 ? (
        <p className="mx-1 my-5 text-sm text-success-text">✓ The two documents are identical.</p>
      ) : (
        result.entries.map((e) => (
          <Change key={`${e.kind}-${e.pointer}-${e.move?.[0] ?? ""}-${e.move?.[1] ?? ""}`} entry={e} pointerStyle={pointerStyle} />
        ))
      )}
    </div>
  );
}

function kindLabel(e: DiffEntry): string {
  if (e.kind === "type" && e.typeChange) return `type ${e.typeChange[0]} → ${e.typeChange[1]}`;
  if (e.kind === "moved" && e.move) return `moved [${e.move[0]}] → [${e.move[1]}]`;
  return e.kind;
}

function Change({ entry, pointerStyle }: { entry: DiffEntry; pointerStyle: PointerStyle }) {
  const look = LOOK[entry.kind];
  const pathText = pointerStyle === "json-pointer" ? entry.pointer || "/" : dollarPath(entry.path);
  const hasA = entry.kind === "removed" || entry.kind === "changed" || entry.kind === "type";
  const hasB = entry.kind === "added" || entry.kind === "changed" || entry.kind === "type";

  const copyPath = () => {
    navigator.clipboard.writeText(pathText).then(
      () => toast.success(`Copied ${pathText}`),
      () => toast.error("Couldn't access the clipboard"),
    );
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[10px] px-3 py-2.5", look.bg)}>
      <span
        aria-hidden
        className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-md bg-black/25 font-mono text-[13px] font-bold", look.tone)}
      >
        {look.sign}
      </span>
      <button
        type="button"
        onClick={copyPath}
        title="Copy path"
        className="cursor-pointer text-left font-mono text-[13px] break-all text-syntax-key hover:underline hover:decoration-syntax-key/50 hover:underline-offset-2"
      >
        {pathText}
      </button>
      <span className={cn("text-[11px] font-bold tracking-[0.04em]", look.tone)}>{kindLabel(entry)}</span>
      {(hasA || hasB) && (
        <span className="flex flex-[1_1_100%] flex-wrap items-center gap-1.5 pl-[34px] font-mono text-[12.5px]">
          {hasA && (
            <span title={inlineDisplay(entry.left, 2000)} className="break-all text-error-text line-through decoration-error-text/60">
              <span className="sr-only">was </span>
              {inlineDisplay(entry.left, PREVIEW)}
            </span>
          )}
          {hasA && hasB && (
            <span aria-hidden className="text-text-faint">
              →
            </span>
          )}
          {hasB && (
            <span title={inlineDisplay(entry.right, 2000)} className="break-all text-success-text">
              {hasA && <span className="sr-only">now </span>}
              {inlineDisplay(entry.right, PREVIEW)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
