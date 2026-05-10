"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Copy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { generateExamples, detectDomain, type RealisticExample, type PatternDomain } from "../realistic-generator";
import { DomainPill } from '../components/domain-pill';
import { ExampleCard } from '../components/example-card';
import type { Compiled } from "../regex.lib";

interface ExamplesPanelProps {
  compiled: Compiled;
  isActive: boolean;
}

export function ExamplesPanel({ compiled, isActive }: ExamplesPanelProps) {
  const [examples, setExamples] = useState<RealisticExample[]>([]);
  const [domain, setDomain]     = useState<PatternDomain>("generic");
  const [seed, setSeed]         = useState(0);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!isActive || !compiled.ok) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const regex = compiled.regex;
    setDomain(detectDomain(regex));

    const timer = setTimeout(() => {
      setExamples(generateExamples(regex, { count: 12 }));
      setLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [isActive, compiled, seed]);

  function handleRegenerate() {
    setSeed((s) => s + 1);
    toast("Refreshed examples", { duration: 1500 });
  }

  function handleCopyAll() {
    if (!examples.length) return;
    navigator.clipboard.writeText(examples.map((e) => e.value).join("\n"));
    toast("Copied all examples", { duration: 2000 });
  }

  // ── Empty states ─────────────────────────────────────────────────────────

  if (!compiled.ok) {
    return (
      <EmptyState
        icon={<AlertCircle size={36} className="text-text-faint opacity-40" />}
        title="Pattern is invalid"
        subtitle="Fix the pattern to see example matches"
      />
    );
  }

  if (!compiled.regex.source || compiled.regex.source === "(?:)") {
    return (
      <EmptyState
        icon={<AlertCircle size={36} className="text-text-faint opacity-40" />}
        title="Write a pattern to see examples"
        subtitle="Examples are generated based on your regex"
      />
    );
  }

  return (
    <div className="flex flex-col">

      {/* ── Panel header (single row) ─────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border-subtle">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-text shrink-0">Sample matches</span>
            <DomainPill domain={domain} />
            <span className="text-sm text-text-faint truncate hidden sm:inline">
              · strings your regex would match
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleRegenerate}
              title="Regenerate"
              className="h-7 w-7 flex items-center justify-center rounded-md text-text-faint hover:text-text hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={handleCopyAll}
              title="Copy all"
              className="h-7 w-7 flex items-center justify-center rounded-md text-text-faint hover:text-text hover:bg-surface-soft transition-colors cursor-pointer"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Body (auto height up to a cap, scrolls if it exceeds) ────────── */}
      <div className="overflow-y-auto px-3.5 py-3 max-h-[320px]">
        {loading ? (
          <div className="py-10 text-center text-sm text-text-faint">Generating…</div>
        ) : examples.length === 0 ? (
          <EmptyState
            icon={<AlertCircle size={36} className="text-text-faint opacity-40" />}
            title="No examples generated"
            subtitle="This pattern is unusual — try the Sample data button or paste your own test string"
            inline
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex, i) => (
              <ExampleCard key={`${ex.value}-${i}`} example={ex} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  subtitle,
  inline = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  inline?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-center", inline ? "py-10" : "h-full py-16 px-6")}>
      {icon}
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="text-sm text-text-faint mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
