"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { Keycap } from "@/components/layout/brand/brand-mark";
import type { ShowcaseTool, Tint } from "./landing-data";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";

const TINT_BG: Record<Tint, string> = {
  clay: "bg-cat-clay",
  teal: "bg-cat-teal",
  sage: "bg-cat-sage",
  rose: "bg-cat-rose",
};
const TINT_TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};

/**
 * The "product window": a working mini command palette over the showcase
 * tools, plus a dock. Arrow keys move the selection, Enter opens the tool.
 */
export function LauncherDemo({ tools, catalogueCount }: { tools: readonly ShowcaseTool[]; catalogueCount: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);

  const q = query.toLowerCase().trim();
  const matches = tools
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !q || `${t.name} ${t.cat} ${t.desc}`.toLowerCase().includes(q));
  const selected = matches.some((m) => m.i === sel) ? sel : (matches[0]?.i ?? sel);
  const cur = tools[selected];

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!matches.length) return;
    const pos = matches.findIndex((m) => m.i === selected);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel(matches[(pos + 1) % matches.length].i);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel(matches[(pos - 1 + matches.length) % matches.length].i);
    } else if (e.key === "Enter") {
      e.preventDefault();
      router.push(`/tools/${cur.slug}`);
    }
  };

  return (
    <div className="flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[20px] bg-[radial-gradient(120%_80%_at_50%_100%,rgba(167,111,62,.22),rgba(11,11,10,0)_60%),#0f0f0e] shadow-window">
      {/* browser chrome */}
      <div className="flex items-center gap-3.5 border-b border-border-subtle px-4 py-3">
        <span aria-hidden="true" className="flex gap-[7px]">
          <span className="size-[11px] rounded-full bg-[#3a3833]" />
          <span className="size-[11px] rounded-full bg-[#3a3833]" />
          <span className="size-[11px] rounded-full bg-[#3a3833]" />
        </span>
        <span className="flex grow justify-center">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/[.04] px-3.5 py-[5px] font-mono text-xs text-text-tertiary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            utilyx.dev
          </span>
        </span>
        <span className="font-mono text-[11px] text-success">● offline-ready</span>
      </div>

      <div className="flex flex-col items-center gap-[26px] px-[clamp(12px,4vw,56px)] pt-[clamp(24px,5vw,64px)] pb-7">
        {/* palette */}
        <div className="w-full max-w-[760px] overflow-hidden rounded-[14px] bg-[rgba(28,28,26,.94)] text-left shadow-search">
          <div className="flex items-center gap-3 border-b border-border-subtle px-[18px] py-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <label htmlFor="launcher-q" className="sr-only">Search tools</label>
            <input
              id="launcher-q"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Search ${catalogueCount} tools…`}
              autoComplete="off"
              className="min-h-7 min-w-0 grow border-0 bg-transparent text-lg text-text outline-none placeholder:text-placeholder"
            />
            <span className="shrink-0 rounded-md border border-border px-2 py-[3px] font-mono text-[11px] whitespace-nowrap text-text-faint">All categories</span>
          </div>
          <div className="flex min-h-[300px] flex-wrap">
            <div className="flex-[1_1_280px] border-r border-border-subtle p-2">
              <div className="px-2.5 pt-2 pb-1.5 text-xs text-text-faint">Tools</div>
              {matches.map(({ t, i }) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setSel(i)}
                  onDoubleClick={() => router.push(`/tools/${t.slug}`)}
                  aria-pressed={i === selected}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left text-sm text-text hover:bg-white/[.04]",
                    i === selected && "bg-white/[.07] hover:bg-white/[.07]",
                  )}
                >
                  <span aria-hidden="true" className={cn("flex size-[26px] items-center justify-center rounded-[7px] font-mono text-[10px] font-medium text-charcoal", TINT_BG[t.tint])}>
                    <KeyIcon icon={toolIcon(t.slug)} box={26} />
                  </span>
                  <span className="grow">{t.name}</span>
                  <span className="text-xs text-text-faint">{t.cat}</span>
                </button>
              ))}
              {matches.length === 0 && (
                <p className="m-0 px-2.5 py-6 text-sm text-text-faint">No match. Try “json” or “color”.</p>
              )}
            </div>
            <div className="flex flex-[1_1_280px] flex-col gap-3.5 p-[18px]">
              <pre className="m-0 min-h-[132px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface p-3.5 font-mono text-[12.5px] leading-[1.65] whitespace-pre text-syntax-plain">
                {cur.sample}
              </pre>
              <div className="text-xs text-text-faint">Information</div>
              <dl className="m-0 flex flex-col text-[13px]">
                <div className="flex justify-between border-b border-white/[.05] py-1.5"><dt className="text-text-faint">Tool</dt><dd className="m-0">{cur.name}</dd></div>
                <div className="flex justify-between border-b border-white/[.05] py-1.5"><dt className="text-text-faint">Does</dt><dd className="m-0">{cur.desc}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-text-faint">Network</dt><dd className="m-0 text-success">0 requests</dd></div>
              </dl>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 border-t border-border-subtle bg-[rgba(20,20,19,.9)] py-[9px] pr-2.5 pl-3.5">
            <span className="inline-flex items-center gap-2 text-[13px] text-text-muted">
              <span aria-hidden="true" className={cn("size-4 rounded-[4px]", TINT_BG[cur.tint])} />
              {cur.name}
            </span>
            <span className="grow" />
            <Link href={`/tools/${cur.slug}`} className="inline-flex items-center gap-1.5 text-[13px] text-text">
              Open tool <Keycap className="h-5 min-w-5 rounded-[5px] text-[11px] text-text">↵</Keycap>
            </Link>
            <span aria-hidden="true" className="h-4 w-px bg-white/10" />
            <span className="inline-flex items-center gap-1.5 text-[13px] text-text-muted">
              Actions <Keycap className="h-5 min-w-5 rounded-[5px] text-[11px] text-text">⌘</Keycap>
              <Keycap className="h-5 min-w-5 rounded-[5px] text-[11px] text-text">K</Keycap>
            </span>
          </div>
        </div>

        {/* dock */}
        <div className="flex flex-col items-center gap-2.5">
          <span className="rounded-md border border-border bg-[rgba(28,28,26,.95)] px-[9px] py-[3px] text-xs text-text-key">{cur.name}</span>
          <div className="surface-glass flex gap-1.5 rounded-2xl border border-border p-2 sm:gap-2">
            {tools.map((t, i) => (
              <button
                key={t.slug}
                type="button"
                aria-label={t.name}
                aria-pressed={i === selected}
                onClick={() => {
                  setSel(i);
                  setQuery("");
                }}
                className={cn(
                  "surface-key flex size-10 items-center sm:size-12 justify-center rounded-xl font-mono text-xs font-medium transition-transform duration-150 hover:-translate-y-[3px]",
                  i === selected ? cn(TINT_TEXT[t.tint], "outline outline-1 outline-offset-2 outline-clay-light/55") : "text-text-faint",
                )}
              >
                <KeyIcon icon={toolIcon(t.slug)} box={38} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
