"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  detectDomain,
  generateExamples,
  type RealisticExample,
} from "../../realistic-generator";
import { DomainPill } from '../../components/domain-pill';
import { MobileSheet } from '../mobile-sheet';
import type { MobileState } from "../types";

interface ExamplesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: MobileState;
}

export function ExamplesSheet({ open, onOpenChange, state }: ExamplesSheetProps) {
  const { compiled, text, setText, setSelectedMatch } = state;
  const [seed, setSeed] = useState(0);

  const { examples, domain } = useMemo(() => {
    void seed;
    // Skip the heavy regex generation while the sheet is closed.
    if (!open || !compiled.ok) {
      return { examples: [] as RealisticExample[], domain: "generic" as const };
    }
    const regex = compiled.regex;
    return {
      examples: generateExamples(regex, { count: 12 }),
      domain: detectDomain(regex),
    };
  }, [open, compiled, seed]);

  function handleAdd(example: RealisticExample) {
    const next = text.endsWith("\n") || text === ""
      ? text + example.value
      : text + "\n" + example.value;
    setText(next);
    setSelectedMatch(null);
    onOpenChange(false);
    toast(`Added "${example.value}" to test string`, { duration: 2000 });
  }

  function handleRegenerate() {
    setSeed((s) => s + 1);
    toast("Refreshed examples", { duration: 1200 });
  }

  // ── Body content ──────────────────────────────────────────────────

  let body: React.ReactNode;
  if (!compiled.ok) {
    body = (
      <EmptyState
        title="Pattern is invalid"
        subtitle="Fix the pattern to see sample matches."
      />
    );
  } else if (!compiled.regex.source || compiled.regex.source === "(?:)") {
    body = (
      <EmptyState
        title="Write a pattern to see samples"
        subtitle="Samples are generated from your regex."
      />
    );
  } else if (examples.length === 0) {
    body = (
      <EmptyState
        title="No samples generated"
        subtitle="This pattern is unusual — try editing it or paste your own test string."
      />
    );
  } else {
    body = (
      <div className="px-3 py-3 space-y-2">
        {examples.map((ex, i) => (
          <ExampleRow key={`${ex.value}-${i}`} example={ex} onAdd={handleAdd} />
        ))}
      </div>
    );
  }

  return (
    <MobileSheet open={open} onOpenChange={onOpenChange} title="Sample matches">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-border-subtle bg-surface">
        <div className="flex items-center gap-2 min-w-0">
          <DomainPill domain={domain} />
          <span className="text-sm text-text-faint truncate">
            strings your regex would match
          </span>
        </div>
        <button
          type="button"
          onClick={handleRegenerate}
          aria-label="Regenerate samples"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-faint hover:text-text hover:bg-surface-soft transition-colors cursor-pointer"
        >
          <RefreshCcw size={16} aria-hidden />
        </button>
      </div>

      {body}
    </MobileSheet>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ExampleRow({
  example,
  onAdd,
}: {
  example: RealisticExample;
  onAdd: (ex: RealisticExample) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(example)}
      className={cn(
        "w-full flex items-center gap-2.5 p-3 rounded-lg cursor-pointer text-left",
        "border border-border-subtle bg-bg hover:border-border hover:bg-surface-soft/50 transition-colors",
      )}
      aria-label={`Add ${example.value} to test string`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-base text-text truncate">
          {example.value || "(empty)"}
        </div>
        <div className="text-sm text-text-faint mt-0.5 truncate">{example.label}</div>
      </div>
      <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-soft text-text-muted">
        <Plus size={16} aria-hidden />
      </span>
    </button>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-12">
      <AlertCircle size={36} className="text-text-faint opacity-50" aria-hidden />
      <p className="text-base font-medium text-text">{title}</p>
      <p className="text-sm text-text-faint max-w-xs">{subtitle}</p>
    </div>
  );
}
