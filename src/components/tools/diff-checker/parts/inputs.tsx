"use client";

import { useEffect, useRef } from "react";
import { Clipboard, Trash2 } from "lucide-react";
import { SideAction, SideHeader } from "./chrome";

/**
 * Two flavours of the input UI:
 *
 *   - `InputsPanel` — the mockup: two labelled, vertically resizable
 *     textareas side by side (stacked on phones), with synced scroll so
 *     the two sides stay aligned while reading.
 *   - `InputsStrip` — collapsed ("Hide inputs" / `e`). One line with the
 *     side line counts and a "Show inputs" button.
 *
 * Synced scroll uses a guard flag (`syncingFrom`) to prevent the cyclic
 * "A scrolled → set B → B fires onScroll → set A" feedback loop.
 */

export interface InputsStripProps {
  leftLines: number;
  rightLines: number;
  onEdit: () => void;
}

export function InputsStrip({ leftLines, rightLines, onEdit }: InputsStripProps) {
  return (
    <div className="flex min-h-[42px] items-center gap-3 border-b border-border-subtle px-4 text-[13px]">
      <span className="font-bold">Inputs hidden</span>
      <span className="font-mono text-xs text-text-faint">
        {leftLines.toLocaleString()} ↔ {rightLines.toLocaleString()} lines
      </span>
      <span className="grow" />
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 font-semibold text-text-key transition-colors hover:bg-surface-soft"
      >
        Show inputs
      </button>
    </div>
  );
}

export interface InputsPanelProps {
  left: string;
  right: string;
  onChangeLeft: (v: string) => void;
  onChangeRight: (v: string) => void;
  onPasteError: () => void;
  leftRef: React.RefObject<HTMLTextAreaElement | null>;
  rightRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function InputsPanel({ left, right, onChangeLeft, onChangeRight, onPasteError, leftRef, rightRef }: InputsPanelProps) {
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
      syncingFrom.current = source;
      dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
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
    <div className="flex flex-wrap border-b border-border-subtle">
      <InputSide id="df-l" side="left" label="Original" value={left} onChange={onChangeLeft} onPasteError={onPasteError} textareaRef={leftRef} />
      <InputSide id="df-r" side="right" label="Changed" value={right} onChange={onChangeRight} onPasteError={onPasteError} textareaRef={rightRef} />
    </div>
  );
}

function InputSide({
  id,
  side,
  label,
  value,
  onChange,
  onPasteError,
  textareaRef,
}: {
  id: string;
  side: "left" | "right";
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPasteError: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
    } catch {
      onPasteError();
    }
  };

  return (
    <div className={`flex min-w-0 flex-[1_1_340px] flex-col ${side === "left" ? "border-r border-border-subtle" : ""}`}>
      <SideHeader htmlFor={id} side={side} label={label} meta={value ? `${value.length.toLocaleString()} chars` : undefined}>
        <SideAction label={`Paste into ${label}`} onClick={() => void paste()}>
          <Clipboard size={14} aria-hidden />
        </SideAction>
        <SideAction label={`Clear ${label}`} onClick={() => onChange("")} disabled={!value}>
          <Trash2 size={14} aria-hidden />
        </SideAction>
      </SideHeader>
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder={`Paste the ${label.toLowerCase()} text…`}
        className="m-0 box-border h-[220px] resize-y border-0 bg-transparent px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-syntax-plain outline-none placeholder:text-placeholder sm:text-[13px]"
      />
    </div>
  );
}
