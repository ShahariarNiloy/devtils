"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { ShowcaseTool } from "./landing-data";
import { LauncherPalette } from "./launcher-demo";
import { PasteDemo } from "./paste-demo";

type TabId = "paste" | "palette";
const TABS: readonly { id: TabId; label: string; glyph: string }[] = [
  { id: "paste", label: "Paste anything", glyph: "⌘V" },
  { id: "palette", label: "Command palette", glyph: "⌘K" },
];

/**
 * The "product window" under the hero: two ways in, as tabs. "Paste
 * anything" (default) detects what you paste; "Command palette" is the
 * working mini palette. Both panels stay mounted so switching keeps state.
 */
export function HeroDemo({
  tools,
  catalogueCount,
}: {
  tools: readonly ShowcaseTool[];
  catalogueCount: number;
}) {
  const [tab, setTab] = useState<TabId>("paste");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // WAI-ARIA tabs: arrows / Home / End move focus and select.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Try utilyx"
        className="-mt-3 flex gap-0.5 rounded-xl border border-border bg-surface p-1"
      >
        {TABS.map((t, i) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`hero-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`hero-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                // 40px drawn; the pseudo-element stretches the hit area to 44px.
                "relative inline-flex min-h-10 items-center gap-2 rounded-[9px] px-4 text-sm font-semibold before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-['']",
                on
                  ? "bg-selected text-text"
                  : "bg-transparent text-text-tertiary hover:text-text",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "font-mono text-xs",
                  on ? "text-clay-light" : "text-text-faint",
                )}
              >
                {t.glyph}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[20px] [background:radial-gradient(120%_80%_at_50%_100%,rgba(167,111,62,.22),rgba(11,11,10,0)_60%),#0f0f0e] shadow-window">
        {/* browser chrome */}
        <div className="flex items-center gap-3.5 border-b border-border-subtle px-4 py-3">
          <span aria-hidden="true" className="flex gap-[7px]">
            <span className="size-[11px] rounded-full bg-[#3a3833]" />
            <span className="size-[11px] rounded-full bg-[#3a3833]" />
            <span className="size-[11px] rounded-full bg-[#3a3833]" />
          </span>
          <span className="flex grow justify-center">
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/[.04] px-3.5 py-[5px] font-mono text-xs text-text-tertiary">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              utilyx.dev
            </span>
          </span>
          <span className="font-mono text-[11px] text-success">
            ● offline-ready
          </span>
        </div>

        <div className="flex h-[1100px] flex-col overflow-hidden px-3 py-5 sm:h-[700px] sm:px-10 sm:pt-9 sm:pb-8">
          {TABS.map((t) => (
            <div
              key={t.id}
              role="tabpanel"
              id={`hero-panel-${t.id}`}
              aria-labelledby={`hero-tab-${t.id}`}
              hidden={t.id !== tab}
              className={cn(
                "min-h-0 w-full flex-1 flex-col items-center justify-center gap-[26px]",
                t.id === tab ? "flex" : "hidden",
              )}
            >
              {t.id === "paste" ? (
                <PasteDemo />
              ) : (
                <LauncherPalette
                  tools={tools}
                  catalogueCount={catalogueCount}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
