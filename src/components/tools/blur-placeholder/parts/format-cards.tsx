"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { FORMATS, kb, valueOf, type FormatId, type Result } from "../blur-placeholder.lib";
import { CHECKER, PlaceholderLayer, TONE } from "./ui";

/** Six format cards; a radiogroup — arrow keys move the pick. */
export function FormatCards({ result, pick, onPick }: { result: Result | null; pick: FormatId; onPick: (id: FormatId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key] ?? 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + FORMATS.length) % FORMATS.length;
    onPick(FORMATS[n].id);
    refs.current[n]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Placeholder type" className="grid grid-cols-2 gap-2.5 [grid-area:cards] sm:grid-cols-3 lg:grid-cols-6">
      {FORMATS.map((f, i) => {
        const on = f.id === pick;
        const size = result ? kb(valueOf(f.id, result).length) : "—";
        return (
          <button
            key={f.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onPick(f.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "flex cursor-pointer flex-col overflow-hidden rounded-xl border p-0 text-left text-inherit transition-colors",
              on
                ? "border-[rgba(224,160,114,0.75)] bg-[rgba(224,160,114,0.06)] shadow-[0_0_0_3px_rgba(224,160,114,0.12)]"
                : "border-border bg-[#0d0d0c] hover:border-white/18",
            )}
          >
            <div className="relative aspect-[16/7] w-full overflow-hidden" style={{ background: result?.alpha ? CHECKER.replace("16px 16px", "14px 14px") : "#121211" }}>
              {result && <PlaceholderLayer id={f.id} r={result} blur={8} />}
              <span className={cn("absolute top-2 left-2 rounded-full bg-[rgba(11,11,10,0.75)] px-[7px] py-0.5 text-[10.5px] font-semibold", TONE[f.tone])}>
                {f.tag}
              </span>
            </div>
            <div className="flex flex-col gap-[3px] px-[11px] pt-2.5 pb-[11px]">
              <div className="flex items-baseline gap-2">
                <span className="grow text-[13px] font-bold">{f.name}</span>
                <span className="font-mono text-[11px] whitespace-nowrap text-text-tertiary">{size}</span>
              </div>
              <span className="text-xs leading-[1.4] text-text-faint">{f.why}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
