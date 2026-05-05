"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Textarea } from "@/components/primitives/Textarea";
import { Button } from "@/components/primitives/Button";
import { Tooltip } from "@/components/primitives/Tooltip";
import { ToolShell } from "@/components/layout/ToolShell";
import { cases } from "./text-case.lib";
import type { Tool } from "@/lib/tools-registry";

export function TextCase({ tool }: { tool: Tool }) {
  const [input, setInput] = useState("Hello world from DevToolbox");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const conversions = useMemo(
    () => cases.map((c) => ({ ...c, output: c.convert(input) })),
    [input],
  );

  const onCopy = async (id: string, value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    toast.success(`Copied ${cases.find((c) => c.id === id)?.label}`);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1300);
  };

  return (
    <ToolShell
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={() => setInput("")}>
            Clear input
          </Button>
          <span className="ml-auto text-xs text-text-muted">
            {input.length} characters · {input.split(/\s+/).filter(Boolean).length} words
          </span>
        </>
      }
    >
      <div className="rounded-xl border border-border-subtle bg-surface p-3">
        <Textarea
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste any text — conversions update live."
          className="border-0 bg-transparent focus:bg-transparent text-sm font-sans"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {conversions.map((c, i) => {
          const copied = copiedId === c.id;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.025, ease: "easeOut" }}
              className="group flex flex-col gap-1.5 rounded-xl border border-border-subtle bg-surface p-3 transition-colors hover:border-border"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-text-faint">
                  {c.label}
                </span>
                <Tooltip content={copied ? "Copied" : "Copy"} side="left">
                  <button
                    type="button"
                    onClick={() => onCopy(c.id, c.output)}
                    aria-label={`Copy ${c.label}`}
                    disabled={!c.output}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-faint opacity-0 group-hover:opacity-100 hover:bg-surface-soft hover:text-text disabled:hover:bg-transparent disabled:opacity-30 transition-opacity"
                  >
                    {copied ? <Check size={11} className="text-brand" /> : <Copy size={11} />}
                  </button>
                </Tooltip>
              </div>
              <code className="font-mono text-xs-plus text-text break-all min-h-[1.4em]">
                {c.output || <span className="text-text-faint">{c.example}</span>}
              </code>
            </motion.div>
          );
        })}
      </div>
    </ToolShell>
  );
}
