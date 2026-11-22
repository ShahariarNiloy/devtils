"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PatchModel } from "../json-diff.engine";
import { tokenizePatchLine, type PatchTokenKind } from "../json-diff.view";
import { VirtualList } from "./virtual-list";

const TOKEN_CLASS: Record<PatchTokenKind, string> = {
  key: "text-syntax-key",
  op: "text-clay-light",
  string: "text-syntax-string",
  number: "text-syntax-number",
  bool: "text-syntax-boolean",
  null: "text-syntax-punctuation",
  punct: "text-syntax-punctuation",
  plain: "text-syntax-plain",
};

/**
 * RFC 6902 output: the verification result (patch applied to the original
 * and compared with the changed document), op count, Copy, then the patch
 * itself — tokenized per visible line only.
 */
export function PatchPanel({
  patch,
  ignoredExcluded,
  scrollEl,
}: {
  patch: PatchModel | null;
  /** Some differences were ignored, so the patch leaves them out. */
  ignoredExcluded: boolean;
  scrollEl: HTMLElement | null;
}) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const lines = useMemo(() => (patch ? patch.text.split("\n") : []), [patch]);
  const copied = patch !== null && copiedText === patch.text;

  const copy = () => {
    if (!patch) return;
    navigator.clipboard.writeText(patch.text).then(
      () => {
        setCopiedText(patch.text);
        toast.success(`Copied ${patch.ops} JSON Patch op${patch.ops === 1 ? "" : "s"}`);
      },
      () => toast.error("Couldn't access the clipboard"),
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-surface px-3.5 py-3">
        {!patch && <span className="text-[13px] text-text-faint">Building and checking the patch…</span>}
        {patch?.verified && (
          <span className="inline-flex items-center gap-2 text-[13px] text-success-text">
            <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/16 text-xs">
              ✓
            </span>
            Verified: applying this patch to the original gives the changed document
            {ignoredExcluded ? " (ignored keys excluded)" : ""}.
          </span>
        )}
        {patch && !patch.verified && (
          <span className="text-[13px] text-error-text">Couldn&rsquo;t verify this patch against the changed document.</span>
        )}
        <span className="grow" />
        <span className="font-mono text-xs text-text-faint">RFC 6902 · {patch ? patch.ops : "…"} ops</span>
        <button
          type="button"
          onClick={copy}
          disabled={!patch}
          className="btn-action min-h-11 cursor-pointer rounded-[9px] px-3.5 text-[13px] font-bold disabled:cursor-default disabled:opacity-50 sm:min-h-[34px]"
        >
          {copied ? "Copied" : "Copy patch"}
        </button>
      </div>
      {patch && (
        <VirtualList
          count={lines.length}
          estimate={21.25}
          scrollEl={scrollEl}
          className="py-2.5 font-mono text-[12px] leading-[1.7] sm:text-[12.5px]"
          render={(i) => (
            <div className="flex min-w-0">
              <span className="flex-[0_0_40px] pr-2.5 text-right text-[#4f4e48] select-none">{i + 1}</span>
              <span className="min-w-0 flex-auto whitespace-pre-wrap [overflow-wrap:anywhere]">
                {tokenizePatchLine(lines[i]).map((t, k) => (
                  // Tokens of a static line never reorder.
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={k} className={TOKEN_CLASS[t.k]}>
                    {t.v}
                  </span>
                ))}
              </span>
            </div>
          )}
        />
      )}
    </div>
  );
}
