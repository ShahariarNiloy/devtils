"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertCircle, Check, X, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/cn";
import type { RepairPreview } from "../json-formatter.types";

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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="top-1/2 -translate-y-1/2 w-[min(960px,calc(100vw-32px))] max-h-[min(720px,calc(100vh-48px))] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Wand2 size={14} className="text-text-muted" />
            Repair preview
          </DialogTitle>
          <DialogDescription>
            {preview?.error
              ? "We couldn't fully repair this — partial fixes are shown below."
              : "Review the changes before applying."}
          </DialogDescription>
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

// ── Body ─────────────────────────────────────────────────────────────────────

function PreviewBody({ preview }: { preview: RepairPreview }) {
  return (
    <div className="flex flex-col gap-4 px-5 pb-4 overflow-y-auto min-h-0">
      {/* Change list */}
      <section>
        <h4 className="text-sm font-semibold text-text mb-2">
          {preview.changes.length === 0
            ? "No structural changes"
            : `${preview.changes.length} change${preview.changes.length !== 1 ? "s" : ""}`}
        </h4>
        {preview.changes.length > 0 && (
          <ul className="rounded-lg border border-border-subtle bg-surface-soft px-3 py-2 space-y-1">
            {preview.changes.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-text-muted">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-text-faint shrink-0" />
                <span className="leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
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
