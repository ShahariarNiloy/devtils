"use client";

import { useCallback } from "react";
import { useShortcut } from "@/lib/keyboard";
import { kb, pctOf, valueOf, type FormatInfo, type OutTab, type Result } from "../blur-placeholder.lib";
import { Seg } from "./ui";

const TABS: { id: OutTab; label: string }[] = [
  { id: "next", label: "Next.js" },
  { id: "react", label: "React" },
  { id: "html", label: "HTML" },
  { id: "value", label: "Raw value" },
];

export function CodePanel({
  code,
  tab,
  onTab,
  format,
  result,
  originalBytes,
  copied,
  onCopy,
}: {
  code: string;
  tab: OutTab;
  onTab: (t: OutTab) => void;
  format: FormatInfo;
  result: Result | null;
  originalBytes: number;
  copied: boolean;
  onCopy: () => void;
}) {
  // ⌘C / Ctrl+C copies the snippet — unless the user has text selected.
  const onShortcut = useCallback(
    (e: KeyboardEvent) => {
      if (window.getSelection()?.toString()) return;
      if (!code) return;
      e.preventDefault();
      onCopy();
    },
    [code, onCopy],
  );
  useShortcut({ key: "c", meta: true, ignoreInEditable: true, label: "Copy code" }, onShortcut);

  const size = result ? valueOf(format.id, result).length : 0;
  const isHash = format.id === "blurhash" || format.id === "thumbhash";

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-white/7 bg-[#0d0d0c] [grid-area:code]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface px-2.5 py-2">
        <div role="tablist" aria-label="Code" className="flex gap-0.5 rounded-lg bg-[#0d0d0c] p-0.5">
          {TABS.map((t) => (
            <Seg
              key={t.id}
              role="tab"
              controls="bp-code"
              on={tab === t.id}
              onClick={() => onTab(t.id)}
              className="min-h-7 rounded-md px-2.5 text-xs"
            >
              {t.label}
            </Seg>
          ))}
        </div>
        <span className="grow" />
        <button
          type="button"
          onClick={onCopy}
          disabled={!code}
          aria-keyshortcuts="Meta+C Control+C"
          className="btn-action inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 rounded-lg border-0 px-3 text-xs font-semibold max-sm:min-h-11"
        >
          {copied ? "Copied" : "Copy"} <span className="font-mono text-[10.5px] opacity-60">⌘C</span>
        </button>
      </div>
      <pre
        id="bp-code"
        role="tabpanel"
        tabIndex={0}
        aria-label={`${format.name} code`}
        className="m-0 h-[236px] overflow-auto px-3.5 py-3 font-mono text-[11.5px] leading-[1.6] break-all whitespace-pre-wrap text-syntax-plain sm:text-xs"
      >
        {code || " "}
      </pre>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-border-subtle px-3.5 py-[9px] text-xs text-text-faint">
        <span className="font-semibold text-text-strong">{format.name}</span>
        <span className="font-mono">{result ? kb(size) : "—"}</span>
        <span>{result ? pctOf(size, originalBytes) : ""}</span>
        {isHash && <span className="text-tier-pro-text">Needs the decoder package on the page</span>}
      </div>
    </div>
  );
}
