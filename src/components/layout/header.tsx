"use client";

import {
  CommandPalette,
  useCommandPalette,
} from '@/components/primitives/command-palette';
import { Kbd } from '@/components/primitives/kbd';
import { Search } from "lucide-react";
import Link from "next/link";
import { Logo } from './brand/Logo';
import { ThemeToggle } from './theme-toggle';

/**
 * Top app bar. Sticky with backdrop blur, sober wordmark on the left,
 * nav links in the middle, palette trigger + theme toggle on the right.
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
        {/* Brand wordmark — inlined SVG so the S2 gradient renders cleanly
            on both light and dark themes. Height tokenized via h-logo. */}
        <Link
          href="/"
          aria-label="utilyx — home"
          className="flex items-center"
        >
          <Logo variant="wordmark" />
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-text-muted">
          <Link href="/tools" className="transition-colors hover:text-text">
            Tools
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-text">
            FAQ
          </Link>
          <Link href="/contact" className="transition-colors hover:text-text">
            Contact
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
            <span className="text-sm">Search tools…</span>
            <span className="ml-3">
              <Kbd>{hint}</Kbd>
            </span>
          </button>

          <ThemeToggle />

          <Link
            href="/tools"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3.5 h-9 text-sm font-semibold transition-colors"
            style={{
              background: "var(--color-brand)",
              color: "var(--color-text-on-sage)",
            }}
          >
            Get started
          </Link>
        </div>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  );
}
