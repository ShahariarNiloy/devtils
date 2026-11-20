"use client";

import { useRef } from "react";
import { Copy, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { SideAction, SideHeader } from "@/components/tools/diff-checker/parts/chrome";
import type { ParseState } from "../use-json-diff";

/**
 * One side of the v2 JSON diff inputs: coloured side label, per-side
 * upload / copy / clear, and a resizable mono textarea that also accepts a
 * dropped file. Parse errors render in `ParseErrorBanner` below the pair.
 */
export function InputPanel({
  id,
  side,
  label,
  value,
  onChange,
  textareaRef,
}: {
  id: string;
  side: "left" | "right";
  label: string;
  value: string;
  onChange: (s: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(
      () => toast.success(`Copied ${label}`),
      () => toast.error("Couldn't access the clipboard"),
    );
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result ?? ""));
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  return (
    <div
      className={`flex min-w-0 flex-[1_1_340px] flex-col ${side === "left" ? "border-r border-border-subtle" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json,.txt"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleFile(f);
            e.target.value = "";
          }
        }}
      />
      <SideHeader htmlFor={id} side={side} label={label}>
        <SideAction label={`Open a file as ${label}`} onClick={() => fileRef.current?.click()}>
          <Upload size={14} aria-hidden />
        </SideAction>
        <SideAction label={`Copy ${label}`} onClick={copy} disabled={!value}>
          <Copy size={14} aria-hidden />
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
        placeholder={`Paste or drop the ${label.replace(" JSON", "").toLowerCase()} JSON…`}
        className="m-0 box-border h-[220px] resize-y border-0 bg-transparent px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-syntax-plain outline-none placeholder:text-placeholder sm:text-[13px]"
      />
    </div>
  );
}

/**
 * Mockup error strip under the inputs, one line per invalid side, with a
 * "Jump to error" action that puts the caret at the parse position.
 */
export function ParseErrorBanner({
  sides,
}: {
  sides: Array<{ label: string; parse: ParseState; value: string; textareaRef: React.RefObject<HTMLTextAreaElement | null> }>;
}) {
  const bad = sides.filter((s) => s.parse.error);
  if (bad.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col gap-1 bg-error-bg px-4 py-3 text-[13px] text-error-text">
      {bad.map((s) => (
        <div key={s.label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <span className="font-semibold">{s.label} isn&rsquo;t valid JSON</span>
            {s.parse.line !== null && ` · line ${s.parse.line}, col ${s.parse.col}`}
            <span className="text-error-text/80"> — {s.parse.error}</span>
          </span>
          {s.parse.line !== null && (
            <button
              type="button"
              onClick={() => jumpTo(s.textareaRef.current, s.value, s.parse)}
              className="cursor-pointer rounded-md px-1.5 py-0.5 font-semibold underline decoration-error-text/40 underline-offset-2 hover:decoration-error-text"
            >
              Jump to error
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function jumpTo(ta: HTMLTextAreaElement | null, value: string, parse: ParseState) {
  if (!ta || parse.line === null) return;
  const lines = value.split("\n");
  let offset = 0;
  for (let i = 0; i < Math.max(0, parse.line - 1) && i < lines.length; i++) offset += lines[i].length + 1;
  const pos = Math.min(offset + (parse.col ? parse.col - 1 : 0), value.length);
  ta.focus();
  ta.setSelectionRange(pos, pos);
}
