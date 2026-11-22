"use client";

import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { JwtDecoderContent, seoData } from "./content";
import { EncodePanel } from "./panels/encode-panel";
import { useJwtDecoder, type JwtDecoderState } from "./useJwtDecoder";
import { DiffView } from "./views/diff-view";
import { SnippetsView } from "./views/snippets-view";
import { ChecksPanel } from "./workspace/checks-panel";
import { HeaderSection, PartTabs, PayloadSection } from "./workspace/decoded-parts";
import { EmptyState } from "./workspace/empty-state";
import { SignaturePanel } from "./workspace/signature-panel";
import { TokenInput } from "./workspace/token-input";
import { Toolbar } from "./workspace/toolbar";

export function JwtDecoder({ tool }: { tool: Tool }) {
  const state = useJwtDecoder();
  const { decoded } = state;

  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied`));
  };
  useShortcut({ key: "c", meta: true, shift: true, label: "Copy payload JSON" }, (e) => {
    e.preventDefault();
    if (decoded) copy(decoded.payloadPretty, "Payload JSON");
  });
  useShortcut({ key: "h", meta: true, shift: true, label: "Copy header JSON" }, (e) => {
    e.preventDefault();
    if (decoded) copy(decoded.headerPretty, "Header JSON");
  });
  useShortcut({ key: "e", meta: true, shift: true, label: "Edit & sign" }, (e) => {
    e.preventDefault();
    state.setMode("encode");
  });
  useShortcut({ key: "d", meta: true, shift: true, label: "Compare two tokens" }, (e) => {
    e.preventDefault();
    state.setMode("diff");
  });
  useShortcut({ key: "l", meta: true, shift: true, label: "Load the valid example" }, (e) => {
    e.preventDefault();
    state.pickSample("valid");
  });

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs} titleStyle="inline">
      <div className="overflow-hidden rounded-[18px] bg-canvas shadow-window-tool">
        <Toolbar state={state} />
        {state.mode === "decode" && <DecodeView state={state} />}
        {state.mode === "encode" && <EncodePanel state={state} />}
        {state.mode === "diff" && <CompareView state={state} />}
        <StatusBar />
      </div>
      <JwtDecoderContent />
    </ToolShell>
  );
}

function DecodeView({ state }: { state: JwtDecoderState }) {
  const { jwt, parseError } = state;
  return (
    <div className="grid items-stretch lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="flex min-w-0 flex-col gap-3.5 p-4 lg:border-r lg:border-white/6">
        <TokenInput value={state.token} onChange={state.setToken} onClear={state.clear} />
        {jwt && <ChecksPanel state={state} />}
      </div>
      <div className="flex min-w-0 flex-col gap-3.5 p-4">
        {jwt ? (
          <>
            <PartTabs value={state.mobilePart} onChange={state.setMobilePart} />
            <HeaderSection state={state} jwt={jwt} />
            <PayloadSection state={state} jwt={jwt} />
            <SignaturePanel state={state} jwt={jwt} />
            {jwt.alg.kind === "supported" && (
              <details className="group rounded-[14px] border border-white/7 max-md:hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-[13px] font-semibold text-text-tertiary hover:text-text">
                  <span aria-hidden="true" className="font-mono text-text-faint transition-transform group-open:rotate-90">
                    ›
                  </span>
                  Show verify code for {jwt.alg.name}
                </summary>
                <div className="border-t border-border-subtle p-3">
                  <SnippetsView jwt={jwt} />
                </div>
              </details>
            )}
          </>
        ) : (
          <EmptyState error={parseError && parseError.segment !== "empty" ? parseError.message : null} />
        )}
      </div>
    </div>
  );
}

function CompareView({ state }: { state: JwtDecoderState }) {
  return (
    <div className="flex flex-col">
      <div className="flex min-h-[46px] items-center gap-2 border-b border-border-subtle pr-2 pl-4">
        <span className="text-[13px] font-bold">Compare two tokens</span>
        <span className="text-xs text-text-faint">payload claims, side by side</span>
        <span className="grow" />
        <button
          type="button"
          onClick={() => state.setMode("decode")}
          className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text max-md:min-h-11"
        >
          <ArrowLeft size={13} aria-hidden />
          Back to decoder
        </button>
      </div>
      <div className="p-4">
        <DiffView a={state.diffA} b={state.diffB} onA={state.setDiffA} onB={state.setDiffB} />
      </div>
    </div>
  );
}

/** Status bar (mockup): what runs, what doesn't. */
function StatusBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-surface px-3.5 py-[9px] font-mono text-[11px] text-text-faint">
      <span className="text-success-text">● Web Crypto</span>
      <span>HS · RS · PS · ES</span>
      <span>no automatic key fetches</span>
      <span className="grow" />
      <span className="text-success-text">Local-only</span>
    </div>
  );
}
