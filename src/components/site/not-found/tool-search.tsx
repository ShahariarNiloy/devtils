"use client";

import Link from "next/link";
import { useState } from "react";
import type { Tint } from "@/lib/tools/presentation";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";

export interface NotFoundTool {
  slug: string;
  name: string;
  glyph: string;
  desc: string;
  tint: Tint;
  /** Lower-cased name + category + description + tags. */
  haystack: string;
}

const TINT_TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};

const LIMIT = 6;

/** Live filter over the live tools; shows popular picks when empty. */
export function ToolSearch({ tools, popular }: { tools: readonly NotFoundTool[]; popular: readonly string[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? tools.filter((t) => q.split(/\s+/).every((w) => t.haystack.includes(w)))
    : popular.flatMap((s) => tools.filter((t) => t.slug === s));
  const shown = matches.slice(0, LIMIT);

  return (
    <>
      <label className="relative mt-1.5 flex min-h-[52px] w-full max-w-[560px] items-center gap-2.5 rounded-xl border border-border bg-toolbar px-4 transition-[border-color,box-shadow] duration-150 focus-within:border-[rgba(224,160,114,0.6)] focus-within:shadow-[0_0_0_3px_rgba(224,160,114,0.15)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-text-faint">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="sr-only">Search tools</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${tools.length} tools`}
          autoComplete="off"
          className="min-w-0 grow border-0 bg-transparent font-[inherit] text-base text-text outline-none placeholder:text-placeholder"
        />
      </label>

      <p aria-live="polite" className="sr-only">
        {q ? `${matches.length} ${matches.length === 1 ? "tool matches" : "tools match"}` : ""}
      </p>

      {shown.length > 0 ? (
        <ul className="relative m-0 mt-2 grid w-full max-w-[760px] list-none grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-2 p-0 text-left">
          {shown.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/tools/${t.slug}`}
                className="surface-panel flex h-full items-center gap-2.5 rounded-xl p-3 text-text transition-colors hover:border-[rgba(224,160,114,0.4)] hover:text-text"
              >
                <span
                  aria-hidden="true"
                  className={`surface-key flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] ${TINT_TEXT[t.tint]}`}
                >
                  <KeyIcon icon={toolIcon(t.slug)} box={30} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-bold">{t.name}</span>
                  <span className="truncate text-xs text-text-faint">{t.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="relative m-0 mt-2 text-[15px] text-text-tertiary">
          No tool matches “{query.trim()}”.{" "}
          <Link href="/request" className="text-text underline underline-offset-2">
            Request it
          </Link>
          .
        </p>
      )}
      {q && matches.length > LIMIT && (
        <p className="relative m-0 text-[13px] text-text-faint">
          Showing {LIMIT} of {matches.length}.{" "}
          <Link href="/tools" className="text-text-tertiary hover:text-text">
            See all tools
          </Link>
        </p>
      )}
    </>
  );
}
