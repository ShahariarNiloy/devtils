"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertCircle, AlertTriangle, Check, X, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/cn";
import type { RepairChange, RepairPreview, RepairRisk } from "../json-formatter.types";

interface RepairPreviewDialogProps {
  preview: RepairPreview | null;
  onApply: () => void;
  onCancel: () => void;
}

export function RepairPreviewDialog({ preview, onApply, onCancel }: RepairPreviewDialogProps) {
  const open = preview !== null;
  const applyRef = useRef<HTMLButtonElement>(null);

  // Auto-focus Apply when the dialog opens so Enter applies. We aim the
  // ref via effect because Radix focuses the first focusable element by
  // default which would be the close-X.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => applyRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const lossyCount = useMemo(
    () => (preview?.events ?? []).filter((e) => e.risk === "lossy").length,
    [preview],
  );

  let description: string;
  if (preview?.error) {
    description = "We couldn't fully repair this — partial fixes are shown below.";
  } else if (lossyCount > 0) {
    description = "Some repairs changed or dropped data — review the highlighted items.";
  } else {
    description = "Review the changes before applying.";
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="top-1/2 -translate-y-1/2 w-[min(960px,calc(100vw-32px))] max-h-[min(720px,calc(100vh-48px))] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Wand2 size={14} className="text-text-muted" />
            Repair preview
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {preview && <PreviewBody preview={preview} />}

        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X size={14} />
            Cancel
          </Button>
          <Button
            ref={applyRef}
            variant="primary"
            size="sm"
            onClick={onApply}
            disabled={!preview || (preview.changes.length === 0 && !preview.error)}
          >
            <Check size={14} />
            {preview?.error ? "Load partial result" : "Apply repair"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Risk metadata ────────────────────────────────────────────────────────────

const RISK_RANK: Record<RepairRisk, number> = { lossy: 0, structural: 1, safe: 2 };

const RISK_LABEL: Record<RepairRisk, string> = {
  lossy: "may change data",
  structural: "structural",
  safe: "safe",
};

const RISK_DOT: Record<RepairRisk, string> = {
  lossy: "bg-warning",
  structural: "bg-info",
  safe: "bg-success",
};

const RISK_CHIP: Record<RepairRisk, string> = {
  lossy: "bg-warning-bg text-warning-text",
  structural: "bg-info-bg text-info-text",
  safe: "bg-success-bg text-success-text",
};

interface CoalescedChange {
  message: string;
  risk: RepairRisk;
  count: number;
  line: number;
  col: number;
}

/** Collapse repeated messages into one row with a count, preserving risk +
 *  first location, then order lossy → structural → safe. */
function coalesce(events: RepairChange[]): CoalescedChange[] {
  const map = new Map<string, CoalescedChange>();
  for (const e of events) {
    const ex = map.get(e.message);
    if (ex) ex.count++;
    else map.set(e.message, { message: e.message, risk: e.risk, count: 1, line: e.line, col: e.col });
  }
  return [...map.values()].sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk]);
}

// ── Body ─────────────────────────────────────────────────────────────────────

function PreviewBody({ preview }: { preview: RepairPreview }) {
  const rows = useMemo(() => coalesce(preview.events ?? []), [preview.events]);

  const counts = useMemo(() => {
    const c: Record<RepairRisk, number> = { lossy: 0, structural: 0, safe: 0 };
    for (const r of rows) c[r.risk] += r.count;
    return c;
  }, [rows]);

  return (
    <div className="flex flex-col gap-4 px-5 pb-4 overflow-y-auto min-h-0">
      {/* Lossy warning — the trust-critical signal, surfaced prominently. */}
      {counts.lossy > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning-border bg-warning-bg px-3 py-2.5 text-warning-text">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div className="min-w-0 text-sm leading-relaxed">
            <span className="font-semibold">
              {counts.lossy} repair{counts.lossy !== 1 ? "s" : ""} changed or dropped data.
            </span>{" "}
            These don&apos;t just reformat — they alter content (e.g. Infinity → null,
            removed text). Review the amber items below before applying.
          </div>
        </div>
      )}

      {/* Change list */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text">
            {rows.length === 0
              ? "No structural changes"
              : `${countsTotal(counts)} change${countsTotal(counts) !== 1 ? "s" : ""}`}
          </h4>
          {rows.length > 0 && (
            <div className="flex items-center gap-1.5">
              {(["lossy", "structural", "safe"] as const).map((risk) =>
                counts[risk] > 0 ? (
                  <span
                    key={risk}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                      RISK_CHIP[risk],
                    )}
                  >
                    <span className="font-mono tabular-nums">{counts[risk]}</span>
                    {RISK_LABEL[risk]}
                  </span>
                ) : null,
              )}
            </div>
          )}
        </div>

        {rows.length > 0 ? (
          <ul className="overflow-hidden rounded-lg border border-border-subtle">
            {rows.map((r) => (
              <li
                key={r.message}
                className={cn(
                  "flex items-center gap-2.5 border-b border-border-subtle px-3 py-2 text-sm last:border-b-0",
                  r.risk === "lossy" ? "bg-warning-bg/40" : "bg-surface-soft",
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", RISK_DOT[r.risk])} />
                <span className="min-w-0 flex-1 leading-relaxed text-text">
                  {r.message}
                  {r.count > 1 && (
                    <span className="ml-1.5 font-mono text-xs text-text-faint">×{r.count}</span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-xs text-text-faint tabular-nums">
                  {r.line}:{r.col}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-faint">The input was already valid JSON.</p>
        )}
      </section>

      {/* Lingering parse error */}
      {preview.error && (
        <section>
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium">Still invalid after repair</div>
              <div className="font-mono text-sm text-danger/90 break-words">{preview.error}</div>
            </div>
          </div>
        </section>
      )}

      {/* Before / after */}
      <section className="flex flex-col gap-2 min-h-0">
        <div className="grid grid-cols-2 gap-3">
          <SideHeader label="Before" tone="muted" />
          <SideHeader label="After" tone={preview.error ? "warning" : "success"} />
        </div>
        <div className="grid grid-cols-2 gap-3 min-h-[180px]">
          <SidePanel code={preview.original} />
          <SidePanel code={preview.fixed} highlight={preview.original} />
        </div>
      </section>
    </div>
  );
}

function countsTotal(counts: Record<RepairRisk, number>): number {
  return counts.lossy + counts.structural + counts.safe;
}

function SideHeader({ label, tone }: { label: string; tone: "muted" | "success" | "warning" }) {
  return (
    <div
      className={cn(
        "text-sm font-semibold uppercase tracking-[0.14em] px-1",
        tone === "muted" && "text-text-faint",
        tone === "success" && "text-success",
        tone === "warning" && "text-danger",
      )}
    >
      {label}
    </div>
  );
}

function SidePanel({ code, highlight }: { code: string; highlight?: string }) {
  // For v1 the "highlight" prop is just used to give the After pane a
  // subtle tint when its content differs from Before. A real line-level
  // diff highlight would be nicer but requires a diff library; the change
  // list above already enumerates what changed.
  const differs = useMemo(
    () => (highlight === undefined ? false : code !== highlight),
    [code, highlight],
  );
  return (
    <pre
      className={cn(
        "rounded-lg border border-border-subtle bg-surface px-3 py-2.5 overflow-auto font-mono text-base leading-code tracking-tight m-0 max-h-[280px]",
        differs && "bg-success/5 border-success/30",
      )}
    >
      <code className="whitespace-pre">{code || "(empty)"}</code>
    </pre>
  );
}
