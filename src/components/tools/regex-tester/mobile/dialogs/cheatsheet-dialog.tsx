"use client";

import { cn } from "@/lib/cn";
import { CHEATSHEET, TOKEN_STYLE } from "../../cheatsheet-data";
import { MobileSheet } from '../mobile-sheet';

interface CheatsheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheatsheetDialog({ open, onOpenChange }: CheatsheetDialogProps) {
  return (
    <MobileSheet open={open} onOpenChange={onOpenChange} title="Regex cheatsheet">
      <div className="px-4 py-4 space-y-5">
        {CHEATSHEET.map((group) => {
          const s = TOKEN_STYLE[group.type];
          return (
            <div key={group.section}>
              <div className="text-sm uppercase tracking-wide font-semibold text-text-faint mb-2">
                {group.section}
              </div>
              <div className="rounded-lg border border-border-subtle overflow-hidden">
                {group.rows.map(([token, desc], i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2 border-b border-border-subtle last:border-b-0"
                  >
                    <code
                      className={cn(
                        "font-mono text-sm rounded px-2 py-0.5 shrink-0 min-w-24 text-center",
                        s.bg,
                        s.text,
                      )}
                    >
                      {token}
                    </code>
                    <span className="text-sm text-text-muted pt-0.5">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </MobileSheet>
  );
}
