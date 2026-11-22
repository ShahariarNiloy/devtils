"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { buildManifest, kb, type Result } from "../blur-placeholder.lib";
import type { Loaded } from "../use-blur-placeholder";

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const cols = "grid-cols-[52px_minmax(0,1fr)_auto] lg:grid-cols-[64px_minmax(0,1.4fr)_90px_80px_80px_minmax(0,1.2fr)_74px]";

export function BatchView({
  items,
  resultOf,
  isExample,
  progress,
  drag,
  onDragLeave,
  onChoose,
  onClear,
  copied,
  copy,
  err,
}: {
  items: readonly Loaded[];
  resultOf: (it: Loaded) => Result | undefined;
  isExample: boolean;
  progress: { done: number; total: number } | null;
  drag: boolean;
  onDragLeave: () => void;
  onChoose: () => void;
  onClear: () => void;
  copied: string;
  copy: (id: string, text: string, what: string) => void;
  err: string;
}) {
  const { rows, ready, manifestText } = useMemo(() => {
    const all = items.map((item) => ({ item, result: resultOf(item) }));
    const done = all.filter((r): r is { item: Loaded; result: Result } => Boolean(r.result));
    // The manifest is written once every row is ready (no half files, no re-layout per update).
    const complete = done.length > 0 && done.length === all.length;
    return { rows: all, ready: done, manifestText: complete ? JSON.stringify(buildManifest(done), null, 2) : "" };
  }, [items, resultOf]);
  const pendingCount = rows.length - ready.length;
  const totalOrig = items.reduce((s, it) => s + it.bytes, 0);
  const totalPh = ready.reduce((s, r) => s + r.result.b64.length, 0);
  const n = items.length;
  let statusText = `${kb(totalPh)} of placeholders for ${kb(totalOrig)} of images`;
  if (pendingCount) statusText = `Working… ${ready.length} of ${n}`;
  if (progress) statusText = `Reading ${progress.done} of ${progress.total}…`;

  return (
    <div className="flex flex-col gap-3.5 p-3 sm:p-4">
      <div
        onDragLeave={onDragLeave}
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-[14px] border-[1.5px] border-dashed p-4",
          drag ? "border-cat-clay bg-[rgba(224,160,114,0.07)]" : "border-border-strong bg-[#0d0d0c]",
        )}
      >
        <div className="flex min-w-0 grow flex-col">
          <span className="text-sm font-bold">Drop a folder&apos;s worth of images</span>
          <span className="text-xs text-text-faint">
            Every file uses the size and adjustments from Single image. Export one JSON file for your build.
          </span>
        </div>
        <button
          type="button"
          onClick={onChoose}
          className="min-h-[34px] cursor-pointer rounded-[9px] border border-border-strong bg-white/4 px-3.5 text-[13px] font-semibold text-text hover:bg-white/8 max-sm:min-h-11"
        >
          Choose images
        </button>
      </div>
      {err && (
        <div role="alert" className="rounded-[10px] bg-[rgba(224,121,95,0.12)] px-3 py-2.5 text-[13px] text-error-text">
          {err}
        </div>
      )}

      <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/7">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-surface px-3 py-2.5">
          <span className="text-[13px] font-bold">
            {n} image{n === 1 ? "" : "s"}
          </span>
          {isExample ? (
            <span className="rounded-full bg-white/6 px-2 py-0.5 text-xs text-text-tertiary">Examples — your files replace these</span>
          ) : (
            <button type="button" onClick={onClear} className="cursor-pointer rounded-md border-0 bg-transparent px-1.5 text-xs text-text-tertiary hover:text-text max-sm:min-h-11">
              Clear list
            </button>
          )}
          <span className="grow" />
          <span className="text-xs text-text-faint" aria-live="polite">
            {statusText}
          </span>
        </div>
        {rows.map(({ item, result }, i) => {
          const id = `row:${item.id}`;
          return (
            <div key={item.id} className={cn("grid items-center gap-3 border-b border-white/5 px-3 py-2.5 last:border-b-0", cols)}>
              <div
                className="relative max-h-12 w-full overflow-hidden rounded-[7px] bg-surface"
                style={{ aspectRatio: `${item.w} / ${item.h}` }}
              >
                {result && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.b64} alt="" className="absolute inset-0 h-full w-full scale-[1.15] object-cover blur-[4px]" />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-[12.5px] text-text-key">{item.label}</span>
                <span className="text-[11.5px] text-text-faint">
                  {item.w}×{item.h} · {kb(item.bytes)} → {result ? kb(result.b64.length) : "…"}
                </span>
              </div>
              <span className="hidden font-mono text-xs text-text-tertiary lg:inline">
                {item.w}×{item.h}
              </span>
              <span className="hidden font-mono text-xs text-text-tertiary lg:inline">{kb(item.bytes)}</span>
              <span className="hidden font-mono text-xs text-tier-pro-text lg:inline">{result ? kb(result.b64.length) : "…"}</span>
              <span className="hidden min-w-0 items-center gap-[7px] font-mono text-xs text-text-tertiary lg:inline-flex">
                <span className="size-3 shrink-0 rounded-[3px]" style={{ background: result?.color ?? "transparent" }} />
                <span className="truncate">{result?.blurhash ?? ""}</span>
              </span>
              <button
                type="button"
                disabled={!result}
                onClick={() => result && copy(id, result.b64, `Base64 for ${item.label}`)}
                aria-label={`Copy Base64 for ${item.label}`}
                className="min-h-7 cursor-pointer rounded-[7px] border border-white/12 bg-transparent px-2.5 text-xs text-text-strong hover:border-white/25 max-sm:min-h-11"
              >
                {copied === id ? "Copied" : "Copy"}
                <span className="sr-only"> row {i + 1}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/7 bg-[#0d0d0c]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface px-2.5 py-2">
          <span className="pl-1 font-mono text-xs text-text-strong">placeholders.json</span>
          <span className="grow" />
          <button
            type="button"
            disabled={!manifestText || pendingCount > 0 || Boolean(progress)}
            onClick={() => download("placeholders.json", manifestText)}
            className="inline-flex min-h-[30px] cursor-pointer items-center rounded-lg border border-border-strong bg-transparent px-3 text-xs font-semibold text-text hover:border-white/30 disabled:opacity-50 max-sm:min-h-11"
          >
            Download
          </button>
          <button
            type="button"
            disabled={!manifestText || pendingCount > 0 || Boolean(progress)}
            onClick={() => copy("man", manifestText, "placeholders.json")}
            className="btn-action min-h-[30px] cursor-pointer rounded-lg border-0 px-3 text-xs font-semibold disabled:opacity-50 max-sm:min-h-11"
          >
            {copied === "man" ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <pre
          tabIndex={0}
          aria-label="placeholders.json"
          className="m-0 h-[260px] overflow-auto px-3.5 py-3 font-mono text-[11.5px] leading-[1.6] break-all whitespace-pre-wrap text-syntax-plain sm:text-xs"
        >
          {(!progress && manifestText) || (n ? "Working…" : "")}
        </pre>
      </div>
    </div>
  );
}
