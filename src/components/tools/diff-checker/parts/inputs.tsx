"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Clipboard, Trash2 } from "lucide-react";

/**
 * Two flavours of the input UI:
 *
 *   - `InputsStrip` — collapsed. Shows side stats + an "Edit inputs"
 *     button. This is the default once both sides are populated; the
 *     diff dominates the viewport.
 *   - `InputsPanel` — expanded. The full editable textareas, with synced
 *     scroll so the two sides stay aligned as the user reads.
 *
 * Synced scroll uses a guard flag (`syncingFrom`) to prevent the cyclic
 * "A scrolled → set B → B fires onScroll → set A" feedback loop. The
 * cheaper alternative (debounce) feels laggy; the flag is one ref and
 * costs nothing.
 */

export interface InputsStripProps {
  leftLines: number;
  rightLines: number;
  onEdit: () => void;
}

export function InputsStrip({ leftLines, rightLines, onEdit }: InputsStripProps) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-left shadow-card transition-colors hover:border-border-strong/60 hover:bg-surface-soft/30 cursor-pointer"
    >
      <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
        Inputs
      </span>
      <span className="font-mono text-sm text-text-faint">
        {leftLines.toLocaleString()} ↔ {rightLines.toLocaleString()} lines
      </span>
      <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-text-faint group-hover:text-text">
        Edit inputs
        <ChevronDown size={14} aria-hidden />
      </span>
    </button>
  );
}

export interface InputsPanelProps {
  left: string;
  right: string;
  onChangeLeft: (v: string) => void;
  onChangeRight: (v: string) => void;
  onCollapse: () => void;
  leftRef: React.RefObject<HTMLTextAreaElement | null>;
  rightRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function InputsPanel({
  left,
  right,
  onChangeLeft,
  onChangeRight,
  onCollapse,
  leftRef,
  rightRef,
}: InputsPanelProps) {
  // Synced scroll between the two textareas.
  const syncingFrom = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;

    const handleScroll = (source: "left" | "right") => () => {
      if (syncingFrom.current && syncingFrom.current !== source) return;
      const src = source === "left" ? l : r;
      const dst = source === "left" ? r : l;
      // Mirror by ratio so unequal-height contents still align reasonably.
      const range = src.scrollHeight - src.clientHeight;
      const ratio = range > 0 ? src.scrollTop / range : 0;
      const dstRange = dst.scrollHeight - dst.clientHeight;
      syncingFrom.current = source;
      dst.scrollTop = ratio * dstRange;
      // Release the lock on the next frame so the resulting "scroll" event
      // doesn't get treated as a fresh user-initiated scroll.
      requestAnimationFrame(() => {
        syncingFrom.current = null;
      });
    };

    const onLeft = handleScroll("left");
    const onRight = handleScroll("right");
    l.addEventListener("scroll", onLeft, { passive: true });
    r.addEventListener("scroll", onRight, { passive: true });
    return () => {
      l.removeEventListener("scroll", onLeft);
      r.removeEventListener("scroll", onRight);
    };
  }, [leftRef, rightRef]);

  return (
    <div className="rounded-xl border border-border bg-surface shadow-card">
      <div className="flex h-11 items-center gap-2 border-b border-border-subtle px-3">
        <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
          Inputs
        </span>
        <span className="font-mono text-sm text-text-faint">
          paste or drop two files
        </span>
        <button
          type="button"
          onClick={onCollapse}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
        >
          <ChevronUp size={14} aria-hidden />
          Collapse
        </button>
      </div>
      <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
        <InputSide
          label="Original"
          value={left}
          onChange={onChangeLeft}
          textareaRef={leftRef}
          placeholder="Paste the original text…"
          side="left"
        />
        <InputSide
          label="Changed"
          value={right}
          onChange={onChangeRight}
          textareaRef={rightRef}
          placeholder="Paste the changed text…"
          side="right"
        />
      </div>
    </div>
  );
}

function InputSide({
  label,
  value,
  onChange,
  textareaRef,
  placeholder,
  side,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder: string;
  side: "left" | "right";
}) {
  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
    } catch {
      // Clipboard blocked / unavailable — let the user retry; toast lives
      // in the orchestrator so this leaf component stays sonner-free.
    }
  };

  return (
    <div
      className={`flex flex-col ${side === "left" ? "md:border-r" : ""} border-border-subtle`}
    >
      <div className="flex h-9 items-center gap-2 border-b border-border-subtle px-3">
        <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
          {label}
        </span>
        <span className="font-mono text-sm text-text-faint">
          {value ? `${value.length.toLocaleString()} chars` : ""}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPaste}
            aria-label={`Paste into ${label}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
          >
            <Clipboard size={13} aria-hidden />
            Paste
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={!value}
            aria-label={`Clear ${label}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-danger disabled:opacity-40 cursor-pointer"
          >
            <Trash2 size={13} aria-hidden />
            Clear
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder={placeholder}
        aria-label={label}
        className="min-h-[180px] w-full resize-none border-0 bg-transparent px-3 py-3 font-mono text-[16px] leading-[1.6] text-text outline-none placeholder:text-text-faint"
      />
    </div>
  );
}
