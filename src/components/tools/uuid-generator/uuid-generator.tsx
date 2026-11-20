"use client";

import { Braces, Download, MoreHorizontal, ScanSearch } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { seoData, UuidGeneratorContent } from "./content";
import { InspectDialog, AnatomyView } from "./inspect-dialog";
import {
  anatomyOf,
  formatId,
  generateIds,
  ID_KINDS,
  KIND_LABEL,
  MAX_COUNT,
  MIN_COUNT,
  type IdKind,
} from "./uuid-generator.lib";
import { Segmented, StatusBar, ToggleButton } from "./v2-controls";

const BULK_COUNT = 1000;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    toast.error("Couldn't copy — your browser blocked clipboard access");
    return false;
  }
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function UuidGenerator({ tool }: { tool: Tool }) {
  const [kind, setKind] = useState<IdKind>("v7");
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [noHyphens, setNoHyphens] = useState(false);
  // Generated after mount: random IDs can't be server-rendered without a hydration mismatch.
  const [ids, setIds] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const regenerate = useCallback((k: IdKind, n: number) => {
    setIds(generateIds(k, n));
    setCopied(null);
  }, []);

  // First batch on the next frame after mount (not during SSR / hydration).
  useEffect(() => {
    const raf = requestAnimationFrame(() => regenerate("v7", 5));
    return () => cancelAnimationFrame(raf);
  }, [regenerate]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  useShortcut({ key: "enter", meta: true, label: "Regenerate IDs" }, (e) => {
    e.preventDefault();
    regenerate(kind, count);
  });

  const isUlid = kind === "ulid";
  const opts = { uppercase, noHyphens };
  const shown = ids.map((id) => formatId(id, kind, opts));
  const all = shown.join("\n");
  const anatomy = useMemo(() => (ids[0] ? anatomyOf(ids[0], kind) : null), [ids, kind]);

  const markCopied = (key: string) => {
    setCopied(key);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 1400);
  };
  const copy = async (text: string, key: string) => {
    if (await copyText(text)) markCopied(key);
  };

  const pickKind = (k: IdKind) => {
    setKind(k);
    regenerate(k, count);
  };
  const step = (delta: number) => {
    const n = Math.max(MIN_COUNT, Math.min(MAX_COUNT, count + delta));
    setCount(n);
    regenerate(kind, n);
  };

  const downloadBulk = () => {
    const bulk = generateIds(kind, BULK_COUNT).map((id) => formatId(id, kind, opts));
    download(`${kind}-ids.txt`, bulk.join("\n") + "\n");
    toast.success(`Downloaded ${BULK_COUNT.toLocaleString("en")} ${KIND_LABEL[kind]}s`);
  };

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3">
          <Segmented label="ID type" value={kind} options={ID_KINDS} onChange={pickKind} className="basis-full sm:flex-none sm:basis-auto" />
          <div role="group" aria-label="How many" className="flex items-center gap-0.5 rounded-[11px] border border-border p-[3px]">
            <button
              type="button"
              aria-label="Fewer"
              disabled={count <= MIN_COUNT}
              onClick={() => step(-1)}
              className="size-10 cursor-pointer rounded-lg text-lg text-text-key hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-16 text-center text-[13px] text-text-tertiary" aria-live="polite">
              <span className="font-mono text-[15px] text-text">{count}</span> {count === 1 ? "ID" : "IDs"}
            </span>
            <button
              type="button"
              aria-label="More"
              disabled={count >= MAX_COUNT}
              onClick={() => step(1)}
              className="size-10 cursor-pointer rounded-lg text-lg text-text-key hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>
          <ToggleButton
            on={isUlid || uppercase}
            onToggle={() => setUppercase((v) => !v)}
            disabled={isUlid}
            title={isUlid ? "ULIDs are always uppercase" : undefined}
          >
            Uppercase
          </ToggleButton>
          <ToggleButton
            on={isUlid || noHyphens}
            onToggle={() => setNoHyphens((v) => !v)}
            disabled={isUlid}
            title={isUlid ? "ULIDs never have hyphens" : undefined}
          >
            No hyphens
          </ToggleButton>
          <span className="grow" />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="More actions"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-border text-text-tertiary hover:bg-white/[0.06] hover:text-text"
            >
              <MoreHorizontal size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuItem onSelect={() => setInspectOpen(true)}>
                <ScanSearch size={14} /> Inspect a pasted ID…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void copy(JSON.stringify(shown, null, 2), "json")} disabled={!shown.length}>
                <Braces size={14} /> Copy as JSON array
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={downloadBulk}>
                <Download size={14} /> Download {BULK_COUNT.toLocaleString("en")} as .txt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => regenerate(kind, count)}
            title="Generate (⌘/Ctrl + Enter)"
            className="btn-action min-h-11 cursor-pointer rounded-[10px] px-4 text-sm font-bold"
          >
            ↻ Generate
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-[420px] flex-wrap">
          <div className="min-w-0 flex-[1.4_1_380px] border-b border-border-subtle p-2 sm:border-r sm:border-b-0">
            <ol aria-label={`Generated ${KIND_LABEL[kind]}s`}>
              {(shown.length ? shown : Array.from({ length: count }, () => "")).map((v, i) => (
                <li
                  // Rows are positional (#1, #2…) and regenerate wholesale.
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  className="flex min-h-12 items-center gap-2.5 rounded-[9px] py-1 pr-1.5 pl-2.5 hover:bg-white/[0.04]"
                >
                  <span className="w-[22px] font-mono text-[11px] text-text-ghost">{i + 1}</span>
                  <span className="min-w-0 grow font-mono text-[12.5px] break-all text-text sm:text-[13px]">
                    {v || <span className="inline-block h-3 w-3/4 rounded bg-white/[0.04] align-middle" />}
                  </span>
                  <button
                    type="button"
                    aria-label={`Copy ID ${i + 1}`}
                    disabled={!v}
                    onClick={() => void copy(v, `row:${i}:${v}`)}
                    className="h-[38px] min-w-11 cursor-pointer rounded-[9px] border border-border px-2.5 text-xs font-semibold text-text-tertiary hover:bg-white/[0.06] hover:text-text"
                  >
                    {copied === `row:${i}:${v}` ? "Copied" : "Copy"}
                  </button>
                </li>
              ))}
            </ol>
            <div className="px-1.5 pt-2.5 pb-1">
              <button
                type="button"
                disabled={!shown.length}
                onClick={() => void copy(all, "all")}
                className="min-h-11 w-full cursor-pointer rounded-[10px] border border-white/[0.12] bg-white/[0.03] text-[13px] font-bold text-text hover:border-white/[0.18]"
              >
                {copied === "all" ? "Copied all" : `Copy all ${shown.length || count}`}
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5 p-3.5">
            <div className="text-xs text-text-faint">Anatomy of #1</div>
            {anatomy ? (
              <AnatomyView anatomy={anatomy} />
            ) : (
              <div className="surface-panel h-[52px] rounded-xl" />
            )}
          </div>
        </div>

        <StatusBar
          tone="text-success"
          text={`${shown.length || count} × ${KIND_LABEL[kind]}`}
          detail="crypto.getRandomValues"
        />
      </div>

      <InspectDialog open={inspectOpen} onOpenChange={setInspectOpen} />

      <UuidGeneratorContent />
    </ToolShell>
  );
}
