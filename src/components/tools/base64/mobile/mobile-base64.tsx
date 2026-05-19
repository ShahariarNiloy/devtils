"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ChevronLeft,
  Copy,
  Download,
  FileInput,
  FileOutput,
  Image as ImageIcon,
  Key,
  Link2,
  Lock,
  LockOpen,
  MoreVertical,
  ScanLine,
  Shield,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { CharsetSelector } from "../components/charset-selector";
import { VariantSelector } from "../components/variant-selector";
import { InputPane } from "../panes/input-pane";
import { OutputPane } from "../panes/output-pane";
import { PRESETS } from "../base64.lib";
import type { Direction } from "../base64.types";
import type { useBase64 } from "../use-base64";

type Pane = "input" | "output";

const PRESET_ICON: Record<string, LucideIcon> = {
  lock: Lock,
  key: Key,
  image: ImageIcon,
  shield: Shield,
};

interface MobileBase64Props {
  tool: Tool;
  s: ReturnType<typeof useBase64>;
  onCopy: () => void;
  onShare: () => void;
}

/**
 * Mobile shell mirroring the JSON-formatter chrome: app bar (replaces the
 * hidden ToolShell header), visible Encode/Decode + Input/Output strips, a
 * single full-height pane, a thumb-zone action bar, and a slide-up "More"
 * sheet for settings and secondary actions. No dense scrolling toolbar.
 */
export function MobileBase64({ tool, s, onCopy, onShare }: MobileBase64Props) {
  const [pane, setPane] = useState<Pane>("input");
  const [moreOpen, setMoreOpen] = useState(false);

  // Flip to Output when a result appears (derived state from props).
  const [lastOutput, setLastOutput] = useState(s.output);
  if (s.output !== lastOutput) {
    setLastOutput(s.output);
    if (s.output && pane === "input") setPane("output");
  }

  let status: { text: string; tone: "valid" | "invalid" | "muted" } | null =
    null;
  if (s.validation && !s.validation.valid) {
    status = { text: "Invalid Base64", tone: "invalid" };
  } else if (s.input && s.roundTripOk === true) {
    status = { text: "Round-trip OK", tone: "valid" };
  } else if (s.input && s.roundTripOk === false) {
    status = { text: "Round-trip mismatch", tone: "invalid" };
  }

  return (
    <div
      className="flex flex-col bg-canvas"
      style={{ height: "calc(100dvh - var(--spacing-header))" }}
    >
      <AppBar
        title={tool.name}
        tier={tool.tier}
        status={status}
        onOpenMore={() => setMoreOpen(true)}
      />

      {/* Input / Output pane switch */}
      <Segmented className="border-b border-border">
        <SegTab
          active={pane === "input"}
          onClick={() => setPane("input")}
          icon={<FileInput size={13} />}
          label="Input"
        />
        <SegTab
          active={pane === "output"}
          onClick={() => setPane("output")}
          icon={<FileOutput size={13} />}
          label="Output"
        />
      </Segmented>

      <div className="min-h-0 flex-1 overflow-hidden">
        {pane === "input" ? (
          <InputPane
            value={s.input}
            onChange={s.setInput}
            onClear={s.clearInput}
            onPaste={s.pasteFromClipboard}
            validation={s.validation}
            inputCharCount={s.inputCharCount}
            inputByteCount={s.inputByteCount}
          />
        ) : (
          <OutputPane
            output={s.output}
            outputBytes={s.outputBytes}
            imageMime={s.imageMime}
            activeTab={s.activeTab}
            onTabChange={s.setActiveTab}
            charset={s.charset}
            outputCharCount={s.outputCharCount}
            outputByteCount={s.inputByteCount}
            sizeDelta={s.sizeDelta}
            onCopy={onCopy}
            onDownload={s.download}
            originalInput={s.direction === "encode" ? s.input : s.output}
            isEncoded={s.direction === "encode"}
            hideTitle
          />
        )}
      </div>

      <BottomBar
        direction={s.direction}
        setDirection={s.setDirection}
        onCopy={onCopy}
        onLoadFile={s.loadFile}
        onOpenMore={() => setMoreOpen(true)}
      />

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        s={s}
        onShare={onShare}
      />
    </div>
  );
}

// ── App bar ───────────────────────────────────────────────────────────────────

function AppBar({
  title,
  tier,
  status,
  onOpenMore,
}: {
  title: string;
  tier: string;
  status: { text: string; tone: "valid" | "invalid" | "muted" } | null;
  onOpenMore: () => void;
}) {
  return (
    <header
      className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-bg/95 px-1 backdrop-blur"
      role="toolbar"
      aria-label="Base64 app bar"
    >
      <Link
        href="/tools"
        aria-label="Back to tools"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
      >
        <ChevronLeft size={20} aria-hidden />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-base font-semibold text-text">
            {title}
          </span>
          <span className="rounded-sm bg-tier-free-bg px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-tier-free-text">
            {tier}
          </span>
        </div>
        {status && (
          <span
            className={cn(
              "mt-0.5 inline-flex items-center gap-1 text-[11px]",
              status.tone === "invalid" && "text-danger",
              status.tone === "valid" && "text-success",
              status.tone === "muted" && "text-text-faint",
            )}
          >
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                status.tone === "invalid" && "bg-danger",
                status.tone === "valid" && "bg-success",
                status.tone === "muted" && "bg-text-faint",
              )}
              aria-hidden
            />
            {status.text}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenMore}
        aria-label="More actions"
        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
      >
        <MoreVertical size={20} aria-hidden />
      </button>
    </header>
  );
}

// ── Segmented strip ───────────────────────────────────────────────────────────

function Segmented({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("shrink-0 bg-canvas px-3 py-2.5", className)}>
      <div className="flex h-10 gap-0.5 rounded-md border border-border-subtle bg-surface-soft p-0.5">
        {children}
      </div>
    </div>
  );
}

function SegTab({
  active,
  onClick,
  icon,
  label,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "primary";
}) {
  const primary = tone === "primary";
  const activeClass = primary ? "bg-brand text-bg" : "bg-surface text-text";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-full flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-semibold transition-colors",
        active ? activeClass : "text-text-faint hover:text-text-muted",
      )}
    >
      <span
        className={cn(
          !active && "text-text-faint",
          active && (primary ? "text-bg" : "text-brand"),
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

// ── Bottom action bar ─────────────────────────────────────────────────────────

function BottomBar({
  direction,
  setDirection,
  onCopy,
  onLoadFile,
  onOpenMore,
}: {
  direction: Direction;
  setDirection: (d: Direction) => void;
  onCopy: () => void;
  onLoadFile: (file: File) => void;
  onOpenMore: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
      e.target.value = "";
    }
  };
  return (
    <div className="shrink-0 border-t border-border bg-surface px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(26,26,24,0.04)]">
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        aria-hidden
        onChange={onPick}
      />
      {/* Encode / Decode takes the primary thumb-zone slot; the actions
          demote to icon buttons alongside it. */}
      <div className="flex items-center gap-2">
        <div className="flex h-11 flex-1 gap-0.5 rounded-md border border-border-subtle bg-surface-soft p-0.5">
          <SegTab
            tone="primary"
            active={direction === "encode"}
            onClick={() => setDirection("encode")}
            icon={<Lock size={13} />}
            label="Encode"
          />
          <SegTab
            tone="primary"
            active={direction === "decode"}
            onClick={() => setDirection("decode")}
            icon={<LockOpen size={13} />}
            label="Decode"
          />
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy result"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-button border border-border bg-surface text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
        >
          <Copy size={17} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Upload a file"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-button border border-border bg-surface text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
        >
          <Upload size={17} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="More actions"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-button border border-border bg-surface text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

// ── More sheet ────────────────────────────────────────────────────────────────

function MoreSheet({
  open,
  onClose,
  s,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  s: ReturnType<typeof useBase64>;
  onShare: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dispatch = useCallback(
    (fn: () => void) => () => {
      fn();
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end bg-charcoal/40 animate-[fade-in_140ms_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="More actions"
    >
      <div
        className="rounded-t-xl border border-b-0 border-border bg-surface pb-[max(0.625rem,env(safe-area-inset-bottom))] animate-[slide-up_200ms_cubic-bezier(0.2,0.9,0.4,1)] max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="mx-auto my-2 h-1 w-9 rounded-full bg-border-strong/40"
        />
        <div className="flex h-12 items-center gap-1 border-b border-border-subtle px-1">
          <span aria-hidden className="h-10 w-10" />
          <span className="flex-1 truncate text-center text-base font-semibold text-text">
            More
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-soft hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        <SheetGroup title="Settings">
          <div className="flex flex-col gap-3 px-4 py-2">
            <div className="overflow-x-auto">
              <VariantSelector value={s.variant} onChange={s.setVariant} />
            </div>
            <CharsetSelector value={s.charset} onChange={s.setCharset} />
          </div>
        </SheetGroup>

        <SheetDivider />

        <SheetGroup title="Actions">
          <SheetItem
            icon={<ScanLine size={17} />}
            label="Strip whitespace"
            onClick={dispatch(s.applyStripWhitespace)}
          />
          <SheetItem
            icon={<ArrowLeftRight size={17} />}
            label="Swap input / output"
            onClick={dispatch(s.swapPanes)}
          />
          <SheetItem
            icon={<Download size={17} />}
            label="Download"
            onClick={dispatch(s.download)}
          />
          <SheetItem
            icon={<Link2 size={17} />}
            label="Copy share link"
            onClick={dispatch(onShare)}
          />
        </SheetGroup>

        <SheetDivider />

        <SheetGroup title="Try an example">
          {PRESETS.map((preset) => {
            const Icon = PRESET_ICON[preset.icon] ?? Lock;
            return (
              <SheetItem
                key={preset.id}
                icon={<Icon size={17} />}
                label={preset.label}
                onClick={dispatch(() => s.loadPreset(preset))}
              />
            );
          })}
        </SheetGroup>
      </div>
    </div>
  );
}

function SheetGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-1.5 pt-2">
      <div className="px-4 pb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function SheetDivider() {
  return <div aria-hidden className="mx-4 h-px bg-border-subtle" />;
}

function SheetItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[14.5px] text-text transition-colors hover:bg-surface-soft active:bg-surface-soft"
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-text-muted">
        {icon}
      </span>
      <span className="flex-1 truncate font-medium">{label}</span>
    </button>
  );
}
