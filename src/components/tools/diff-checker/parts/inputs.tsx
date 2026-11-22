"use client";

import { useEffect, useRef } from "react";
import { Clipboard, Trash2 } from "lucide-react";
import { flushPendingEdits, LazyCodeEditor } from "@/components/primitives/code-editor";
import { SideAction, SideHeader } from "./chrome";

/**
 * Two flavours of the input UI:
 *
 *   - `InputsPanel` — the mockup: two labelled, vertically resizable
 *     code editors side by side (stacked on phones), with synced scroll so
 *     the two sides stay aligned while reading. The editors are the shared
 *     lazily-loaded CodeMirror (plain text): it renders only the visible
 *     lines, so typing in a multi-MB input stays instant where a textarea
 *     re-laid-out the whole document on every key.
 *   - `InputsStrip` — collapsed ("Hide inputs" / `e`). One line with the
 *     side line counts and a "Show inputs" button.
 *
 * Synced scroll uses a guard flag (`syncingFrom`) to prevent the cyclic
 * "A scrolled → set B → B fires onScroll → set A" feedback loop. The
 * scrollers live inside the lazily-mounted editors, so the listener is a
 * capture-phase one on each side's box (scroll doesn't bubble, but it
 * does capture) and the scrollers are looked up when an event arrives.
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
  /** Each side's box (wraps its editor) — for synced scroll and `focusInput`. */
  leftRef: React.RefObject<HTMLDivElement | null>;
  rightRef: React.RefObject<HTMLDivElement | null>;
}

const scrollerOf = (box: HTMLElement | null) => box?.querySelector<HTMLElement>(".cm-scroller") ?? null;

/**
 * Focus the editor inside a side's box. `box` is read lazily and retried for
 * a few frames: the panel may have just been shown and the editor chunk may
 * still be mounting.
 */
export function focusInput(box: () => HTMLElement | null, tries = 30) {
  const el = box()?.querySelector<HTMLElement>(".cm-content");
  if (el) el.focus();
  else if (tries > 0) requestAnimationFrame(() => focusInput(box, tries - 1));
}

export function InputsPanel({ left, right, onChangeLeft, onChangeRight, onPasteError, leftRef, rightRef }: InputsPanelProps) {
  const syncingFrom = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;

    const handleScroll = (source: "left" | "right") => (e: Event) => {
      if (syncingFrom.current && syncingFrom.current !== source) return;
      const src = source === "left" ? scrollerOf(l) : scrollerOf(r);
      const dst = source === "left" ? scrollerOf(r) : scrollerOf(l);
      if (!src || !dst || e.target !== src) return;
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
    l.addEventListener("scroll", onLeft, { passive: true, capture: true });
    r.addEventListener("scroll", onRight, { passive: true, capture: true });
    return () => {
      l.removeEventListener("scroll", onLeft, { capture: true });
      r.removeEventListener("scroll", onRight, { capture: true });
    };
  }, [leftRef, rightRef]);

  return (
    <div className="flex flex-wrap border-b border-border-subtle">
      <InputSide side="left" label="Original" value={left} onChange={onChangeLeft} onPasteError={onPasteError} boxRef={leftRef} />
      <InputSide side="right" label="Changed" value={right} onChange={onChangeRight} onPasteError={onPasteError} boxRef={rightRef} />
    </div>
  );
}

/** File drops are handled by the window (two files → both sides); the editor just mustn't insert them too. */
const ignoreDrop = () => {};

function InputSide({
  side,
  label,
  value,
  onChange,
  onPasteError,
  boxRef,
}: {
  side: "left" | "right";
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPasteError: () => void;
  boxRef: React.RefObject<HTMLDivElement | null>;
}) {
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      // Deliver pending keystrokes first so the paste replaces them in order.
      flushPendingEdits();
      onChange(text);
    } catch {
      onPasteError();
    }
  };

  return (
    <div ref={boxRef} className={`flex min-w-0 flex-[1_1_340px] flex-col ${side === "left" ? "border-r border-border-subtle" : ""}`}>
      <SideHeader side={side} label={label} meta={value ? `${value.length.toLocaleString()} chars` : undefined}>
        <SideAction label={`Paste into ${label}`} onClick={() => void paste()}>
          <Clipboard size={14} aria-hidden />
        </SideAction>
        <SideAction
          label={`Clear ${label}`}
          onClick={() => {
            flushPendingEdits();
            onChange("");
          }}
          disabled={!value}
        >
          <Trash2 size={14} aria-hidden />
        </SideAction>
      </SideHeader>
      <LazyCodeEditor
        language="plain"
        value={value}
        onChange={onChange}
        onDropFile={ignoreDrop}
        wrap
        lineNumbers={false}
        lineHeight={1.7}
        padding="14px 16px"
        ariaLabel={`${label} text`}
        placeholder={`Paste the ${label.toLowerCase()} text…`}
        // Vertically resizable like the textarea was (the editor fills the host).
        className="h-[220px] resize-y overflow-hidden text-[12.5px] sm:text-[13px]"
      />
    </div>
  );
}
