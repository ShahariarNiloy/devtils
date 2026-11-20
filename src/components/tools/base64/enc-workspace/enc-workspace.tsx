"use client";

import { MoreHorizontal, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";

export type EncMode = "encode" | "decode";
export type EncTone = "ok" | "error" | "idle" | "busy";

export interface EncStatus {
  tone: EncTone;
  text: string;
  detail?: string;
}

export interface EncWorkspaceProps {
  /** DOM id for the input textarea (label target). */
  id: string;
  mode: EncMode;
  onModeChange: (m: EncMode) => void;
  /** The single switch in the toolbar (URL-safe, Full URL, Escape non-ASCII). */
  option: { label: string; on: boolean; onToggle: () => void; title?: string };
  /** "13 B → 20 B" — right side of the toolbar. */
  sizes: string;
  inLabel: string;
  outLabel: string;
  input: string;
  onInput: (v: string) => void;
  placeholder?: string;
  /** Upload button + drop target on the input pane. */
  onUpload: (file: File) => void;
  uploadLabel?: string;
  /** Pill next to the output label ("Live" / "Invalid input"). */
  liveStatus: { text: string; tone: EncTone };
  /** Output text — rendered as the default body and copied by Copy. */
  output: string;
  outTone: "encoded" | "decoded" | "error";
  /** Custom output body (alt views, error details). Replaces the default <pre>. */
  outputBody?: ReactNode;
  /** Small extra controls in the output header, before Swap. */
  outputHeaderExtra?: ReactNode;
  /** Banner shown above the textarea (e.g. a validation hint). */
  inputBanner?: ReactNode;
  onSwap: () => void;
  canSwap: boolean;
  /** Override what Copy puts on the clipboard. Return false if nothing was copied. */
  onCopy?: () => Promise<boolean>;
  /** Items for the ⋯ menu: every feature the mockup doesn't draw. */
  moreMenu?: ReactNode;
  /** Bottom status bar. */
  status: EncStatus;
  statusExtra?: ReactNode;
}

const TONE_TEXT: Record<EncTone, string> = {
  ok: "text-success",
  error: "text-error",
  idle: "text-text-faint",
  busy: "text-text-tertiary",
};
const TONE_DOT: Record<EncTone, string> = {
  ok: "bg-success",
  error: "bg-error",
  idle: "bg-text-faint",
  busy: "bg-text-tertiary",
};
const OUT_TONE = { encoded: "text-code-rose", decoded: "text-syntax-plain", error: "text-error-text" } as const;

const MODES: readonly [EncMode, string][] = [
  ["encode", "Encode"],
  ["decode", "Decode"],
];

/**
 * v2 "enc" family workspace (Base64, URL, HTML entities): direction
 * segments + one option switch + sizes, then input | output panes, then the
 * mono status bar. Pure presentation — each tool owns its state.
 */
export function EncWorkspace(props: EncWorkspaceProps) {
  const {
    id, mode, onModeChange, option, sizes, inLabel, outLabel, input, onInput, placeholder,
    onUpload, uploadLabel = "Upload file", liveStatus, output, outTone, outputBody, outputHeaderExtra,
    inputBanner, onSwap, canSwap, onCopy, moreMenu, status, statusExtra,
  } = props;

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const copy = useCallback(async () => {
    let ok = false;
    try {
      if (onCopy) ok = await onCopy();
      else if (output) {
        await navigator.clipboard.writeText(output);
        ok = true;
      }
    } catch {
      toast.error("Couldn't reach the clipboard");
      return;
    }
    if (!ok) {
      toast("Nothing to copy yet", { duration: 1200 });
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1400);
  }, [onCopy, output]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    const file = e.dataTransfer.files?.[0];
    setDragging(false);
    if (!file) return;
    e.preventDefault();
    onUpload(file);
  };

  return (
    <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3">
        <div
          role="group"
          aria-label="Direction"
          className="flex flex-[1_1_100%] gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px] sm:flex-none"
        >
          {MODES.map(([m, label]) => {
            const on = m === mode;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => onModeChange(m)}
                className={cn(
                  "min-h-10 flex-1 basis-0 cursor-pointer rounded-lg px-4 text-sm font-semibold transition-colors",
                  on
                    ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
                    : "text-text-tertiary hover:bg-white/6 hover:text-text",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={option.on}
          onClick={option.onToggle}
          title={option.title}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-border px-3 text-[13px] font-semibold text-text-key transition-colors hover:bg-white/4"
        >
          <span
            aria-hidden
            className={cn("relative inline-block h-5 w-[34px] shrink-0 rounded-full transition-colors", option.on ? "bg-accent" : "bg-[#3a3833]")}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-text transition-[left] duration-150 motion-reduce:transition-none",
                option.on ? "left-4" : "left-0.5",
              )}
            />
          </span>
          {option.label}
        </button>

        <span className="grow" />
        <span className="font-mono text-xs text-text-faint" aria-live="polite">{sizes}</span>

        {moreMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                title="More options"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-white/6 hover:text-text data-[state=open]:bg-white/6 data-[state=open]:text-text"
              >
                <MoreHorizontal size={16} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-60">
              {moreMenu}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Panes */}
      <div className="grid md:h-[max(400px,calc(100dvh-var(--chrome-top,165px)-130px))] md:grid-cols-2">
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-col md:border-r md:border-border-subtle",
            dragging && "bg-white/3",
          )}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
            setDragging(false);
          }}
          onDrop={onDrop}
        >
          <div className="flex min-h-[46px] shrink-0 items-center gap-2 border-b border-border-subtle pr-2 pl-4">
            <span className="text-[13px] font-bold">{inLabel}</span>
            <span className="grow" />
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              aria-label={uploadLabel}
              title={`${uploadLabel} (or drop one here)`}
              onClick={() => fileRef.current?.click()}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-white/6 hover:text-text"
            >
              <Upload size={15} aria-hidden />
            </button>
          </div>
          {inputBanner}
          <label htmlFor={id} className="sr-only">{inLabel}</label>
          <textarea
            id={id}
            value={input}
            onChange={(e) => onInput(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            placeholder={placeholder}
            className="m-0 min-h-[220px] w-full grow resize-none border-0 bg-transparent p-4 font-mono text-[12.5px] leading-[1.8] break-all text-text outline-none placeholder:text-text-ghost sm:text-[13px]"
          />
          {dragging && (
            <div className="pointer-events-none absolute inset-2 top-[54px] flex items-center justify-center rounded-xl border border-dashed border-border-strong font-mono text-xs text-text-tertiary">
              Drop to load the file
            </div>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col border-t border-border-subtle md:border-t-0">
          <div className="flex min-h-[46px] shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle py-1 pr-2 pl-4">
            <span className="text-[13px] font-bold">{outLabel}</span>
            <span className={cn("inline-flex items-center gap-1.5 text-xs", TONE_TEXT[liveStatus.tone])} aria-live="polite">
              <span aria-hidden className={cn("size-1.5 rounded-full", TONE_DOT[liveStatus.tone])} />
              {liveStatus.text}
            </span>
            <span className="grow" />
            {outputHeaderExtra}
            <button
              type="button"
              onClick={onSwap}
              disabled={!canSwap}
              title="Use output as input"
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-text-key transition-colors enabled:hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden>⇄</span> Swap
            </button>
            <button
              type="button"
              onClick={() => void copy()}
              className="btn-action inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-bold"
            >
              <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div className="max-h-[60dvh] min-h-[180px] grow overflow-auto md:max-h-none md:min-h-0">
            {outputBody ?? (
              <pre
                className={cn(
                  "m-0 min-h-full p-4 font-mono text-[12.5px] leading-[1.8] break-all whitespace-pre-wrap sm:text-[13px]",
                  OUT_TONE[outTone],
                )}
              >
                {output || <span className="text-text-ghost">Output appears here as you type.</span>}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
        <span className={TONE_TEXT[status.tone]}>● {status.text}</span>
        {status.detail && <span>{status.detail}</span>}
        {statusExtra}
        <span className="grow" />
        <span className="text-success-text">Local-only</span>
      </div>
    </div>
  );
}

/** Output body used for errors: the message, plus optional detail/actions. */
export function EncError({ message, hint, children }: { message: string; hint?: string; children?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col gap-2 p-4 font-mono text-[12.5px] leading-[1.8] sm:text-[13px]">
      <p className="m-0 break-words text-error-text">{message}</p>
      {hint && <p className="m-0 font-sans text-[13px] text-text-tertiary">{hint}</p>}
      {children && <div className="flex flex-wrap gap-2 pt-1 font-sans">{children}</div>}
    </div>
  );
}

/** Small outline button for use inside EncError / headers. */
export function EncChip({ onClick, children, title }: { onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-text-key transition-colors hover:bg-white/6"
    >
      {children}
    </button>
  );
}

/** Reads a dropped/picked file as text, with a size guard. */
export async function readFileText(file: File, maxBytes = 5 * 1024 * 1024): Promise<string | null> {
  if (file.size > maxBytes) {
    toast.error(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit here is ${maxBytes / 1024 / 1024} MB`);
    return null;
  }
  try {
    return await file.text();
  } catch {
    toast.error(`Couldn't read ${file.name}`);
    return null;
  }
}
