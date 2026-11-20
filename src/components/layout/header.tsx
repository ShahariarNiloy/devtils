"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  CommandPalette,
  useCommandPalette,
} from "@/components/primitives/command-palette";
import { cn } from "@/lib/cn";
import { BrandMark, Keycap } from "./brand/brand-mark";
import { MobileMenu } from "./mobile-menu";

/**
 * Where the nav is rendered. The v2 mockups differ only in the links that
 * are shown and the right-hand action:
 *   - landing   → ⌘K hint + "Open tools"
 *   - catalogue → "Request a tool"  (Tools is the current page)
 *   - tool      → "Jump to tool ⌘K" (Tools is the current section)
 */
export type HeaderVariant = "landing" | "catalogue" | "tool";

interface NavLink {
  href: string;
  label: string;
}

const LANDING_LINKS: NavLink[] = [
  { href: "/tools", label: "Tools" },
  { href: "/#categories", label: "Categories" },
  { href: "/changelog", label: "Changelog" },
  { href: "/faq", label: "FAQ" },
];

const SECTION_LINKS: NavLink[] = [
  { href: "/tools", label: "Tools" },
  { href: "/changelog", label: "Changelog" },
  { href: "/faq", label: "FAQ" },
];

/** Floating glass nav (v2). Not sticky — it sits 16px below the viewport top. */
export function Header({ variant = "landing" }: { variant?: HeaderVariant }) {
  const { open, setOpen, hint } = useCommandPalette();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = variant === "landing" ? LANDING_LINKS : SECTION_LINKS;
  const mod = hint.startsWith("⌘") ? "⌘" : "Ctrl";

  return (
    <div className="relative z-[5] flex justify-center px-5 pt-4">
      <nav
        aria-label="Primary"
        className="surface-glass flex w-full max-w-[1000px] flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border py-2.5 pr-3 pl-[18px]"
      >
        <Link href="/" aria-label="utilyx — home" className="text-text hover:text-text">
          <BrandMark />
        </Link>

        {/* ≥ sm: inline links + action */}
        <div className="hidden grow flex-wrap justify-center gap-[22px] text-sm sm:flex">
          {links.map((l) => {
            const current = variant !== "landing" && l.href === "/tools";
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "transition-colors hover:text-text",
                  current ? "font-semibold text-text" : "text-text-tertiary",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {variant === "landing" && (
          <>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open command palette"
              className="hidden items-center gap-1.5 rounded-md sm:flex"
            >
              <Keycap>{mod}</Keycap>
              <Keycap>K</Keycap>
            </button>
            <Link
              href="/tools"
              className="btn-action hidden min-h-9 items-center rounded-[9px] px-3.5 text-sm font-semibold sm:inline-flex"
            >
              Open tools
            </Link>
          </>
        )}
        {variant === "catalogue" && (
          <Link
            href="/request"
            className="btn-action hidden min-h-9 items-center rounded-[9px] px-3.5 text-sm font-semibold sm:inline-flex"
          >
            Request a tool
          </Link>
        )}
        {variant === "tool" && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hidden items-center gap-1.5 text-xs text-text-tertiary transition-colors hover:text-text sm:flex"
          >
            Jump to tool
            <Keycap className="text-[11px]">{mod}</Keycap>
            <Keycap className="text-[11px]">K</Keycap>
          </button>
        )}

        {/* < sm: search + menu */}
        <span className="grow sm:hidden" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search tools"
          className="flex size-11 items-center justify-center rounded-[10px] text-text-key sm:hidden"
        >
          <Search size={18} strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="flex size-11 items-center justify-center rounded-[10px] border border-white/10 bg-white/[.04] text-text-key sm:hidden"
        >
          <Menu size={18} strokeWidth={2} aria-hidden />
        </button>
      </nav>

      <CommandPalette open={open} onOpenChange={setOpen} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} onSearch={() => setOpen(true)} />
    </div>
  );
}
