"use client";

import { ArrowLeft, Copy, FileCode2, GitCompare, KeyRound, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import { useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { JwtDecoderContent, seoData } from "./content";
import { EncodePanel } from "./panels/encode-panel";
import { useJwtDecoder, type JwtDecoderState } from "./useJwtDecoder";
import { DiffView } from "./views/diff-view";
import { DecodedPanel } from "./workspace/decoded-panel";
import { TokenEditor } from "./workspace/token-editor";
import { VerifyRow } from "./workspace/verify-row";

export function JwtDecoder({ tool }: { tool: Tool }) {
  const state = useJwtDecoder();
  const { jwt } = state;

  const copyJson = useCallback((obj: unknown, label: string) => {
    void navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    toast.success(`${label} copied as JSON`);
  }, []);

  useShortcut({ key: "Enter", meta: true, label: "Decode now" }, (e) => {
    e.preventDefault();
    state.forceDecode();
  });
  useShortcut({ key: "v", meta: true, shift: true, label: "Verify signature" }, (e) => {
    e.preventDefault();
    void state.runVerify();
  });
  useShortcut({ key: "c", meta: true, shift: true, label: "Copy payload" }, (e) => {
    e.preventDefault();
    if (jwt) copyJson(jwt.payload, "Payload");
  });
  useShortcut({ key: "h", meta: true, shift: true, label: "Copy header" }, (e) => {
    e.preventDefault();
    if (jwt) copyJson(jwt.header, "Header");
  });
  useShortcut({ key: "e", meta: true, shift: true, label: "Switch to encode" }, (e) => {
    e.preventDefault();
    state.setMode("encode");
  });
  useShortcut({ key: "d", meta: true, shift: true, label: "Switch to compare" }, (e) => {
    e.preventDefault();
    state.setMode("diff");
  });
  useShortcut({ key: "l", meta: true, shift: true, label: "Load sample" }, (e) => {
    e.preventDefault();
    state.loadSample();
  });

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px] md:flex md:h-[max(var(--ws-min,580px),calc(100dvh-var(--chrome-top,165px)-24px))] md:flex-col">
        {state.mode === "decode" ? (
          <div className="flex min-h-[480px] md:min-h-0 md:flex-1 md:[&>*]:min-h-0 md:[&>*]:overflow-auto flex-col md:flex-row">
            <div className="flex min-w-0 flex-1 flex-col border-b border-border-subtle md:border-r md:border-b-0">
              <TokenHeader state={state} copyJson={copyJson} />
              <TokenEditor value={state.rawInput} onChange={state.setRawInput} />
              <VerifyRow state={state} />
            </div>
            <DecodedPanel state={state} />
          </div>
        ) : (
          <div className="flex min-h-[480px] flex-col md:min-h-0 md:flex-1 md:overflow-auto">
            <div className="flex min-h-[46px] items-center gap-2 border-b border-border-subtle bg-toolbar pr-2 pl-4">
              <span className="text-[13px] font-bold">
                {state.mode === "encode" ? "Encode a token" : "Compare two tokens"}
              </span>
              <span className="text-xs text-text-faint">
                {state.mode === "encode" ? "signed locally with WebCrypto" : "payload claims, side by side"}
              </span>
              <span className="grow" />
              <button
                type="button"
                onClick={() => state.setMode("decode")}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
              >
                <ArrowLeft size={13} aria-hidden />
                Back to decoder
              </button>
            </div>
            {state.mode === "encode" ? (
              <EncodePanel state={state} />
            ) : (
              <div className="p-4">
                <DiffView a={state.diffA} b={state.diffB} onA={state.setDiffA} onB={state.setDiffB} />
              </div>
            )}
          </div>
        )}
        <StatusBar state={state} />
      </div>
      <JwtDecoderContent />
    </ToolShell>
  );
}

function TokenHeader({ state, copyJson }: { state: JwtDecoderState; copyJson: (obj: unknown, label: string) => void }) {
  const { jwt, rawInput } = state;
  const empty = !rawInput.trim();
  let status = { text: "Not a JWT", tone: "text-error", dot: "bg-error" };
  if (empty) status = { text: "Empty", tone: "text-text-faint", dot: "bg-text-faint" };
  else if (jwt) status = { text: "Decoded", tone: "text-success", dot: "bg-success" };

  const copyShare = () => {
    const url = state.shareLink();
    if (!url) return;
    void navigator.clipboard.writeText(url);
    toast.message("Share link copied", {
      description: "The token rides in the #hash, so it never reaches a server — but anyone with the link can read it.",
    });
  };

  return (
    <div className="flex min-h-[46px] items-center gap-2 border-b border-border-subtle pr-2 pl-4">
      <span className="text-[13px] font-bold">Encoded token</span>
      <span className={cn("inline-flex items-center gap-1.5 text-xs", status.tone)} aria-live="polite">
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", status.dot)} />
        {status.text}
      </span>
      <span className="grow" />
      <button
        type="button"
        onClick={state.loadSample}
        className="min-h-[34px] rounded-lg px-2.5 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
      >
        Sample
      </button>
      <button
        type="button"
        aria-label="Clear token"
        onClick={state.clear}
        className="flex size-[34px] items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-white/6 hover:text-text"
      >
        <Trash2 size={15} aria-hidden />
      </button>
      {/* Everything the mockup doesn't show lives in one quiet menu. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="flex size-[34px] items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-white/6 hover:text-text"
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <MenuRow
            icon={<Copy size={14} />}
            label="Copy token"
            disabled={empty}
            onClick={() => {
              void navigator.clipboard.writeText(rawInput.trim());
              toast.success("Token copied");
            }}
          />
          <MenuRow icon={<Copy size={14} />} label="Copy header JSON" hint="⌘⇧H" disabled={!jwt} onClick={() => jwt && copyJson(jwt.header, "Header")} />
          <MenuRow icon={<Copy size={14} />} label="Copy payload JSON" hint="⌘⇧C" disabled={!jwt} onClick={() => jwt && copyJson(jwt.payload, "Payload")} />
          <MenuRow icon={<Link2 size={14} />} label="Copy share link" disabled={empty} onClick={copyShare} />
          <DropdownMenuSeparator />
          <MenuRow icon={<KeyRound size={14} />} label="Encode a token" hint="⌘⇧E" onClick={() => state.setMode("encode")} />
          <MenuRow icon={<GitCompare size={14} />} label="Compare two tokens" hint="⌘⇧D" onClick={() => state.setMode("diff")} />
          <MenuRow icon={<FileCode2 size={14} />} label="Load sample" hint="⌘⇧L" onClick={state.loadSample} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MenuRow({ icon, label, hint, onClick, disabled }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <DropdownMenuItem onSelect={onClick} disabled={disabled} className="flex items-center gap-2.5">
      <span aria-hidden="true" className="text-text-faint">{icon}</span>
      <span className="grow">{label}</span>
      {hint && <span className="font-mono text-[11px] text-text-faint">{hint}</span>}
    </DropdownMenuItem>
  );
}

/** v2 status bar: ● Decoded · HS256 · 6 claims … Local-only. */
function StatusBar({ state }: { state: JwtDecoderState }) {
  const { jwt, rawInput, mode } = state;
  let status: { text: string; tone: string; detail: string };
  if (mode === "encode") {
    status = state.encodeError
      ? { text: "Can't encode", tone: "text-error", detail: "" }
      : { text: state.encoded ? "Signed" : "Ready", tone: "text-success", detail: state.encAlg };
  } else if (mode === "diff") {
    status = { text: "Comparing", tone: "text-text-faint", detail: "payload claims" };
  } else if (jwt) {
    const n = Object.keys(jwt.payload).length;
    status = { text: "Decoded", tone: "text-success", detail: `${jwt.header.alg} · ${n} ${n === 1 ? "claim" : "claims"}` };
  } else if (rawInput.trim()) {
    status = { text: "Invalid token", tone: "text-error", detail: "" };
  } else {
    status = { text: "Waiting for token", tone: "text-text-faint", detail: "" };
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
      <span className={status.tone}>● {status.text}</span>
      {status.detail && <span>{status.detail}</span>}
      <span className="grow" />
      <span className="text-success-text">Local-only</span>
    </div>
  );
}
