"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ToolShell } from '@/components/layout/tool-shell';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/primitives/resizable";
import { useShortcut } from "@/lib/keyboard";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Base64Guide } from './components/base64-guide';
import { Base64Content } from './content';
import { MobileBase64 } from './mobile/mobile-base64';
import { InputPane } from './panes/input-pane';
import { OutputPane } from './panes/output-pane';
import { TopActionBar } from './panes/top-action-bar';
import { useBase64 } from "./use-base64";
import type { Tool } from "@/lib/tools-registry";

const URL_SAFE_CYCLE = ["standard", "url-safe"] as const;

export function Base64({ tool }: { tool: Tool }) {
  const s = useBase64();
  const isMobile = useIsMobile();

  const onCopy = useCallback(async () => {
    if (!s.output) {
      toast("Nothing to copy yet", { duration: 1000 });
      return;
    }
    await s.copyOutput();
    toast.success(`Copied ${s.output.length.toLocaleString()} chars`);
  }, [s]);

  const onShare = useCallback(() => {
    const url = s.shareUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }, [s]);

  const onToggleUrlSafe = useCallback(() => {
    const idx = URL_SAFE_CYCLE.indexOf(s.variant as typeof URL_SAFE_CYCLE[number]);
    s.setVariant(URL_SAFE_CYCLE[(idx + 1) % 2]);
  }, [s]);

  // Keyboard shortcuts
  useShortcut({ key: "Enter", meta: true },          (e) => { e.preventDefault(); s.encodeNow(); });
  useShortcut({ key: "d", meta: true, shift: true }, (e) => { e.preventDefault(); s.decodeNow(); });
  useShortcut({ key: "v", meta: true, shift: true }, (e) => { e.preventDefault(); s.validate(); });
  useShortcut({ key: "c", meta: true, shift: true }, (e) => { e.preventDefault(); void onCopy(); });
  useShortcut({ key: "x", meta: true, shift: true }, (e) => { e.preventDefault(); s.swapPanes(); });
  useShortcut({ key: "w", meta: true, shift: true }, (e) => { e.preventDefault(); s.applyStripWhitespace(); });
  useShortcut({ key: "u", meta: true, shift: true }, (e) => { e.preventDefault(); onToggleUrlSafe(); });

  return (
    <ToolShell tool={tool} classNames={{ header: "hidden md:block" }}>
      {isMobile ? (
        <MobileBase64 tool={tool} s={s} onCopy={onCopy} onShare={onShare} />
      ) : (
      <div className="flex flex-col gap-3">
        {/* Detached top action bar — matches the JSON formatter scaffold. */}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border shadow-card bg-surface">
            <TopActionBar
              direction={s.direction}
              setDirection={s.setDirection}
              variant={s.variant}
              setVariant={s.setVariant}
              charset={s.charset}
              setCharset={s.setCharset}
              isProcessing={s.isProcessing}
              onCopy={onCopy}
              onDownload={s.download}
              onShare={onShare}
              onSwap={s.swapPanes}
              onStripWhitespace={s.applyStripWhitespace}
              onPreset={s.loadPreset}
              onLoadFile={s.loadFile}
              roundTripOk={s.roundTripOk}
              showRoundTrip={!!s.input}
            />
          </div>
          <div className="ml-auto">
            <Base64Guide />
          </div>
        </div>

        {/* Editor card — resizable input / output split. */}
        <div
          className="flex flex-col overflow-hidden rounded-xl border border-border shadow-card bg-surface"
          style={{
            height: "max(520px, calc(100dvh - var(--spacing-header) - 88px))",
          }}
        >
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            <ResizablePanel defaultSize={50} minSize={25}>
              <InputPane
                value={s.input}
                onChange={s.setInput}
                onClear={s.clearInput}
                onPaste={s.pasteFromClipboard}
                validation={s.validation}
                inputCharCount={s.inputCharCount}
                inputByteCount={s.inputByteCount}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
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
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <Base64Content />
      </div>
      )}
    </ToolShell>
  );
}
