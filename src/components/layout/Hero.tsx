"use client";

import { openCommandPalette } from "@/components/primitives/CommandPalette";
import { isMac } from "@/lib/keyboard";
import { TOOL_COUNT } from "@/lib/tools-registry";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Search-first hero. Headline + subline on the left, big search field on
 * the right that opens the global ⌘K palette when clicked or focused.
 * The field is a real button styled to look like an input — no duplicate
 * search state to keep in sync with the palette.
 */
export function Hero() {
  const [shortcut] = useState(() => (isMac() ? "⌘ K" : "Ctrl K"));

  return (
    <section className="relative border-b border-border bg-bg">
      <div
        aria-hidden
        className="h-1 w-full"
        style={{ background: "var(--color-sage-olive)" }}
      />

      <div className="mx-auto max-w-7xl px-6 sm:px-10 pt-16 pb-20 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px] gap-12 lg:gap-16 items-center">
          {/* ─── Left column ──────────────────────────── */}
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-eyebrow"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-muted)",
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--color-sage-olive)" }}
                aria-hidden
              />
              v0.0.1 — {TOOL_COUNT} utilities, all client-side
            </span>

            <h1 className="display mt-7 text-hero-md sm:text-6xl lg:text-hero-lg font-semibold leading-hero tracking-tight">
              <span className="block">Tiny developer tools,</span>
              <span className="block">exactly where you</span>
              <span className="block">reach for them.</span>
            </h1>

            <p className="mt-7 text-lg leading-desc max-w-xl text-text-muted">
              Format JSON, encode Base64, test regex, convert colors, compress
              PDFs.{" "}
              <span className="text-text font-semibold">
                Keyboard-first, offline-capable
              </span>
              , and styled with the kind of care you&apos;d save for the front
              end of your own product.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/tools"
                className="group inline-flex items-center gap-2 rounded-button px-5 h-btn-lg text-sm font-semibold transition-all hover:-translate-y-px active:translate-y-0"
                style={{
                  background: "var(--color-brand)",
                  color: "var(--color-text-on-sage)",
                  boxShadow: "0 6px 18px -10px rgba(61, 68, 53, 0.55)",
                }}
              >
                Browse all tools
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>

              <Link
                href="/tools/json-formatter"
                className="inline-flex items-center gap-2 rounded-button border border-border bg-transparent px-5 h-btn-lg text-sm font-semibold text-text transition-colors hover:border-border-strong hover:bg-surface"
              >
                Try JSON formatter
              </Link>
            </div>
          </div>

          {/* ─── Right column — big search field ──────── */}
          <div className="relative">
            <button
              type="button"
              onClick={openCommandPalette}
              aria-label={`Search ${TOOL_COUNT} tools — opens command palette`}
              className="group relative flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-5 h-hero-input text-left transition-all hover:border-border-strong hover:-translate-y-px"
              style={{
                boxShadow: "0 12px 32px -20px rgba(26,26,24,0.18)",
              }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-button"
                style={{
                  background: "var(--color-mist-sage)",
                  color: "var(--color-olive-ink)",
                }}
                aria-hidden
              >
                <Search size={16} />
              </span>
              <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-sm font-medium truncate text-text">
                  Search {TOOL_COUNT} tools…
                </span>
                <span className="text-xs truncate text-text-faint">
                  JSON, regex, base64, colors, PDFs…
                </span>
              </span>
              <kbd className="hidden sm:inline-flex items-center justify-center rounded-md border border-border bg-bg px-2 h-7 mono text-xs font-medium shrink-0 text-text-muted">
                {shortcut}
              </kbd>
            </button>

            <div
              aria-hidden
              className="pointer-events-none absolute -z-10 inset-x-6 -bottom-3 h-2 rounded-full"
              style={{
                background: "var(--color-mist-sage)",
                opacity: 0.6,
                filter: "blur(8px)",
              }}
            />

            <p className="mt-4 text-center text-xs text-text-faint">
              Tip — press{" "}
              <kbd className="inline-flex items-center justify-center rounded border border-border bg-surface px-1.5 h-5 mono text-2xs font-medium align-middle text-text-muted">
                {shortcut}
              </kbd>{" "}
              from anywhere to search.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
