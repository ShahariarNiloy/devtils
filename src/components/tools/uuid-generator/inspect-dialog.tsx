"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/primitives/dialog";
import { cn } from "@/lib/cn";
import { inspectId, KIND_LABEL, type Anatomy, type IdPart } from "./uuid-generator.lib";

const PART_TEXT: Record<IdPart, string> = {
  time: "text-cat-clay",
  version: "text-cat-rose",
  variant: "text-cat-sage",
  random: "text-cat-teal",
  sep: "text-text-faint",
};

const PART_DOT: Record<IdPart, string> = {
  time: "bg-cat-clay",
  version: "bg-cat-rose",
  variant: "bg-cat-sage",
  random: "bg-cat-teal",
  sep: "bg-text-faint",
};

/** Colour-coded ID + legend (mockup "Anatomy of #1"). */
export function AnatomyView({ anatomy }: { anatomy: Anatomy }) {
  return (
    <>
      <div className="surface-panel rounded-xl p-3.5 font-mono text-[13px] leading-[1.8] break-all">
        {anatomy.segments.map((s, i) => (
          // Segments are positional slices of one fixed-length ID.
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} className={PART_TEXT[s.part]}>
            {s.text}
          </span>
        ))}
      </div>
      {anatomy.legend.map((l) => (
        <div key={l.part} className="flex items-start gap-2.5 text-[13px]">
          <span aria-hidden="true" className={cn("mt-[5px] size-2.5 shrink-0 rounded-[3px]", PART_DOT[l.part])} />
          <span>
            <strong className="font-bold">{l.label}</strong> <span className="text-text-tertiary">{l.detail}</span>
          </span>
        </div>
      ))}
    </>
  );
}

/** Paste any UUID / ULID to see its version and, for v7 / ULID, when it was made. */
export function InspectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [value, setValue] = useState("");
  const result = value.trim() ? inspectId(value) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Inspect an ID</DialogTitle>
          <DialogDescription>Paste a UUID or ULID to see its version and when a v7 or ULID was created.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2.5 px-5 pb-5">
          <label className="flex min-h-12 items-center rounded-lg border border-border bg-[#0d0d0c] px-3 focus-within:border-[rgba(224,160,114,0.5)]">
            <span className="sr-only">ID to inspect</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="018f3c6e-…  or  01HZX…"
              className="min-w-0 grow bg-transparent font-mono text-[13px] text-text outline-none placeholder:text-placeholder"
            />
          </label>
          {result && !result.ok && (
            <div role="alert" className="rounded-lg border border-error-border bg-error-bg px-3 py-2 text-[13px] text-error-text">
              {result.error}
            </div>
          )}
          {result?.ok && (
            <>
              <div className="text-xs text-text-faint">{KIND_LABEL[result.kind]}</div>
              <AnatomyView anatomy={result.anatomy} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
