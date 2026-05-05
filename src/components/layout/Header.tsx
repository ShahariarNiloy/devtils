"use client";

import {
  CommandPalette,
  useCommandPalette,
} from "@/components/primitives/CommandPalette";
import { Kbd } from "@/components/primitives/Kbd";
import { Search } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.69-.01-1.36-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/**
 * Top app bar. Sticky with backdrop blur, sober wordmark on the left,
 * nav links in the middle, palette trigger + theme toggle + ghost CTAs
 * on the right. Olive-ink hover accents instead of terracotta to match
 * the new restrained palette.
 */
export function Header() {
  const { open, setOpen, hint } = useCommandPalette();

  return (
    <header
      className="sticky top-0 z-30 h-header border-b border-border"
      style={{
        background: "color-mix(in oklab, var(--color-bg) 88%, transparent)",
        backdropFilter: "saturate(140%) blur(10px)",
      }}
    >
      <div className="mx-auto flex h-full max-w-8xl items-center gap-6 px-6 sm:px-10">
        {/* Brand wordmark */}
        <Link
          href="/"
          className="group flex items-center gap-2 text-text transition-colors"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-150"
            style={{ background: "var(--color-sage-olive)" }}
            aria-hidden
          />
          <span
            className="display text-lg font-bold"
            style={{ letterSpacing: "-0.025em" }}
          >
            devtoolbox
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-text-muted">
          <Link href="/tools" className="transition-colors hover:text-text">
            Tools
          </Link>
          <Link href="/#all" className="transition-colors hover:text-text">
            Pricing
          </Link>
          <Link href="/#all" className="transition-colors hover:text-text">
            Changelog
          </Link>
          <Link
            href="/#all"
            className="transition-colors hover:text-text inline-flex items-center gap-1.5"
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--color-success)" }}
              aria-hidden
            />
            Status
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open command palette"
            className="group hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            <Search size={13} />
            <span className="text-xs-plus">Search tools…</span>
            <span className="ml-3">
              <Kbd>{hint}</Kbd>
            </span>
          </button>

          <ThemeToggle />

          <Link
            href="/#all"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-xs-plus font-semibold text-text-muted transition-colors hover:text-text"
          >
            Sign in
          </Link>

          <Link
            href="/tools"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3.5 h-9 text-xs-plus font-semibold transition-colors"
            style={{
              background: "var(--color-brand)",
              color: "var(--color-text-on-sage)",
            }}
          >
            Get started
          </Link>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="DevToolbox source on GitHub"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
          >
            <GithubMark size={15} />
          </a>
        </div>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  );
}
