"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { RealisticExample } from "../realistic-generator";

interface ExampleCardProps {
  example: RealisticExample;
}

export function ExampleCard({ example }: ExampleCardProps) {
  const [copied, setCopied] = useState(false);

  function handleClick() {
    navigator.clipboard.writeText(example.value);
    toast(`Copied "${example.value}"`, { duration: 1500 });
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={example.label}
      className={cn(
        "group inline-flex items-center gap-1.5 max-w-full",
        "rounded-md border px-2 py-1 font-mono text-sm transition-all duration-150 cursor-pointer",
        copied
          ? "border-[var(--color-border-strong)] bg-[var(--color-mist-sage)]/50 text-text"
          : "border-border bg-bg text-text hover:border-border-strong hover:bg-surface-soft/60",
      )}
    >
      <span className="truncate">{example.value || "(empty)"}</span>
      <span className="shrink-0 text-text-faint group-hover:text-text transition-colors">
        {copied ? <Check size={12} /> : <ClipboardCopy size={12} />}
      </span>
    </button>
  );
}
