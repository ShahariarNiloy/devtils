"use client";

import { Copy, Trash2, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { flushPendingEdits, LazyCodeEditor } from "@/components/primitives/code-editor";
import { SideAction } from "@/components/tools/diff-checker/parts/chrome";
import { cn } from "@/lib/cn";
import type { SideStatus } from "../json-diff.engine";

export type Side = "a" | "b";

const LABEL: Record<Side, string> = { a: "Original", b: "Changed" };
const DOT: Record<Side, string> = { a: "bg-error", b: "bg-success" };

/** "Valid · 24 lines" / "Empty" / "Line 3, col 5: Unexpected token". */
export function statusText(s: SideStatus | undefined): { text: string; cls: string } {
  if (!s) return { text: "", cls: "text-text-faint" };
  if (s.state === "ok") return { text: `Valid · ${s.lines.toLocaleString()} line${s.lines === 1 ? "" : "s"}`, cls: "text-success-text" };
  if (s.state === "empty") return { text: "Empty", cls: "text-text-faint" };
  return { text: `Line ${s.line}, col ${s.col}: ${s.message}`, cls: "text-error-text" };
}

interface PaneProps {
  side: Side;
  value: string;
  onChange: (s: string) => void;
  /** Current text, including an edit still pending in the editor (for Copy). */
  read: () => string;
  status: SideStatus | undefined;
  /** Set by "Jump to the error"; cleared once the editor has moved its caret. */
  jumpTo?: { line: number; col: number; nonce: number };
  onJumped: () => void;
  mobile?: boolean;
}

function useFileLoad(onChange: (s: string) => void) {
  return (file: File) => {
    file.text().then(
      (text) => {
        // Deliver any pending keystrokes first, so the load replaces them
        // in order rather than a late debounced flush overwriting the file.
        flushPendingEdits();
        onChange(text);
        toast.success(`Loaded ${file.name}`);
      },
      () => toast.error(`Couldn't read ${file.name}`),
    );
  };
}

function SideActions({ side, value, onChange, read }: { side: Side; value: string; onChange: (s: string) => void; read: () => string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useFileLoad(onChange);
  const label = LABEL[side];
  return (
    <span className="ml-auto flex shrink-0 items-center">
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json,.txt"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) load(f);
          e.target.value = "";
        }}
      />
      <SideAction label={`Open a file as ${label}`} onClick={() => fileRef.current?.click()}>
        <Upload size={14} aria-hidden />
      </SideAction>
      <SideAction
        label={`Copy ${label}`}
        disabled={!value}
        onClick={() =>
          navigator.clipboard.writeText(read()).then(
            () => toast.success(`Copied ${label}`),
            () => toast.error("Couldn't access the clipboard"),
          )
        }
      >
        <Copy size={14} aria-hidden />
      </SideAction>
      <SideAction
        label={`Clear ${label}`}
        disabled={!value}
        onClick={() => {
          flushPendingEdits();
          onChange("");
        }}
      >
        <Trash2 size={14} aria-hidden />
      </SideAction>
    </span>
  );
}

function Editor({ side, value, onChange, status, jumpTo, onJumped, mobile }: PaneProps) {
  const load = useFileLoad(onChange);
  const errLine = status?.state === "error" ? status.line : 0;
  const errorLines = useMemo(() => (errLine ? [errLine] : []), [errLine]);
  return (
    <LazyCodeEditor
      language="json"
      value={value}
      onChange={onChange}
      onDropFile={load}
      errorLines={errorLines}
      jumpTo={jumpTo}
      onJumped={onJumped}
      lineNumbers={false}
      lineHeight={1.6}
      padding={mobile ? "12px" : "12px 14px"}
      ariaLabel={`${LABEL[side]} JSON`}
      placeholder={`Paste or drop the ${LABEL[side].toLowerCase()} JSON…`}
      className={cn("bg-[#0d0d0c]", mobile ? "h-[260px] text-xs" : "h-[230px] text-[12.5px]")}
    />
  );
}

/** Desktop / tablet: Original and Changed side by side. */
export function InputPanes({
  a,
  b,
}: {
  a: PaneProps;
  b: PaneProps;
}) {
  return (
    <div className="grid grid-cols-2 border-b border-border-subtle">
      {[a, b].map((p) => {
        const st = statusText(p.status);
        return (
          <div key={p.side} className={cn("flex min-w-0 flex-col", p.side === "a" && "border-r border-border-subtle")}>
            <div className="flex min-h-10 items-center gap-2 border-b border-white/5 pr-1.5 pl-3.5">
              <span aria-hidden className={cn("size-[7px] shrink-0 rounded-[2px]", DOT[p.side])} />
              <span className="shrink-0 text-[13px] font-bold">{LABEL[p.side]}</span>
              <span className={cn("min-w-0 truncate text-xs", st.cls)}>{st.text}</span>
              <SideActions side={p.side} value={p.value} onChange={p.onChange} read={p.read} />
            </div>
            <Editor {...p} />
          </div>
        );
      })}
    </div>
  );
}

/** Mobile: one editor at a time behind Original / Changed tabs. */
export function InputTabs({ tab, onTab, a, b }: { tab: Side; onTab: (s: Side) => void; a: PaneProps; b: PaneProps }) {
  const p = tab === "a" ? a : b;
  const st = statusText(p.status);
  return (
    <div className="border-b border-border-subtle">
      <div role="tablist" aria-label="Inputs" className="grid grid-cols-2 gap-1 p-2">
        {(["a", "b"] as const).map((s) => {
          const on = s === tab;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onTab(s)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center gap-[7px] rounded-[9px] text-sm font-semibold",
                on ? "bg-selected text-text" : "text-text-tertiary",
              )}
            >
              <span aria-hidden className={cn("size-[7px] rounded-[2px]", DOT[s])} />
              {LABEL[s]}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 pb-1.5 pl-3 pr-1.5">
        <span className={cn("min-w-0 truncate text-xs", st.cls)}>{st.text}</span>
        <SideActions side={p.side} value={p.value} onChange={p.onChange} read={p.read} />
      </div>
      <Editor key={p.side} {...p} mobile />
    </div>
  );
}

/** Inputs hidden: just the two statuses. */
export function InputsCollapsed({ a, b }: { a: SideStatus | undefined; b: SideStatus | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-b border-border-subtle px-3.5 py-2.5 text-xs">
      {(
        [
          ["a", a],
          ["b", b],
        ] as const
      ).map(([s, status]) => {
        const st = statusText(status);
        return (
          <span key={s} className="inline-flex min-w-0 items-center gap-[7px]">
            <span aria-hidden className={cn("size-[7px] shrink-0 rounded-[2px]", DOT[s])} />
            <span className="font-semibold text-text-strong">{LABEL[s]}</span>
            <span className={cn("truncate", st.cls)}>{st.text}</span>
          </span>
        );
      })}
    </div>
  );
}
