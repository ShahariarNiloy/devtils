"use client";

import { cn } from "@/lib/cn";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/primitives/dialog";
import { CHEATSHEET, TOKEN_STYLE } from "../cheatsheet-data";

export function CheatsheetDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <ScrollText size={15} />
          Cheatsheet
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(660px,calc(100vw-32px))] !top-4 !translate-y-0 max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base font-semibold">Regex Cheatsheet</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-5">
          {CHEATSHEET.map((group) => {
            const s = TOKEN_STYLE[group.type];
            return (
              <div key={group.section}>
                <div className="text-sm font-semibold text-text-muted uppercase tracking-[0.07em] mb-2">
                  {group.section}
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  {group.rows.map(([token, desc], i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 px-3 py-2 border-b border-border-subtle last:border-b-0 hover:bg-surface-soft/50 transition-colors"
                    >
                      <code
                        className={cn(
                          "font-mono text-sm rounded px-2 py-0.5 shrink-0 min-w-[6.5rem] text-center",
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
      </DialogContent>
    </Dialog>
  );
}
