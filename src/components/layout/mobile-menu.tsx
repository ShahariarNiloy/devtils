"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, SHOWCASE_TOOLS } from "@/lib/tools-registry";
import { CATEGORY_TINT, type Tint } from "@/lib/tools/presentation";
import { Dialog, DialogClose, DialogSheetContent, DialogTitle } from "@/components/primitives/dialog";
import { BrandMark } from "./brand/brand-mark";

const TINT_BG: Record<Tint, string> = {
  clay: "bg-cat-clay",
  teal: "bg-cat-teal",
  sage: "bg-cat-sage",
  rose: "bg-cat-rose",
};

const CATS = CATEGORIES.map((c) => ({
  name: c,
  n: SHOWCASE_TOOLS.filter((t) => t.category === c).length,
  tint: CATEGORY_TINT[c],
  href: `/tools/category/${c.toLowerCase().replace(/\./g, "-")}`,
})).filter((c) => c.n > 0);

const LINKS = [
  { href: "/tools", label: "Tools", meta: String(SHOWCASE_TOOLS.length) },
  { href: "/blog", label: "Blog", meta: "" },
  { href: "/changelog", label: "What's new", meta: "" },
  { href: "/faq", label: "FAQ", meta: "" },
];

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: () => void;
}

/**
 * v2 mobile menu (< sm): full-screen sheet with search, main links,
 * categories and the Request CTA. A dialog for focus trapping and Esc; the
 * mockup's theme picker is omitted (site is dark-only).
 */
export function MobileMenu({ open, onOpenChange, onSearch }: MobileMenuProps) {
  const close = () => onOpenChange(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogSheetContent aria-describedby={undefined} className="bg-[#0f0f0e]">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
            <Link href="/" onClick={close} className="flex min-h-11 grow items-center text-text hover:text-text">
              <BrandMark />
            </Link>
            <DialogClose
              aria-label="Close menu"
              className="flex size-11 items-center justify-center rounded-[10px] border border-white/10 text-text-key"
            >
              <X size={20} aria-hidden />
            </DialogClose>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-4 pt-1 pb-6">
            <button
              type="button"
              onClick={() => {
                close();
                onSearch();
              }}
              className="flex min-h-[52px] items-center gap-2.5 rounded-xl border border-white/10 bg-[#161615] px-3.5 text-left text-[15px] text-text-faint"
            >
              <Search size={18} aria-hidden />
              Search {SHOWCASE_TOOLS.length} tools
            </button>

            <nav aria-label="Main" className="flex flex-col">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  className="flex min-h-[52px] items-center border-b border-border-subtle px-1.5 text-lg font-semibold text-text hover:bg-white/5 hover:text-text"
                >
                  <span className="grow">{l.label}</span>
                  {l.meta && <span className="text-[13px] font-medium text-text-faint">{l.meta}</span>}
                  <span aria-hidden="true" className="ml-2.5 text-text-faint">›</span>
                </Link>
              ))}
            </nav>

            <div>
              <div className="mb-2 text-xs text-text-faint">Categories</div>
              <div className="grid grid-cols-2 gap-1.5">
                {CATS.map((c) => (
                  <Link
                    key={c.name}
                    href={c.href}
                    onClick={close}
                    className="flex min-h-11 items-center gap-2 rounded-[10px] border border-border-subtle bg-[#161615] px-3 text-sm text-text hover:text-text"
                  >
                    <span aria-hidden="true" className={`size-[7px] rounded-[2px] ${TINT_BG[c.tint]}`} />
                    <span className="grow">{c.name}</span>
                    <span className="font-mono text-[11px] text-text-faint">{c.n}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-white/[.07] px-4 pt-3 pb-5">
            <Link
              href="/request"
              onClick={close}
              className="btn-action flex min-h-[52px] items-center justify-center rounded-xl text-base font-bold"
            >
              Request a tool
            </Link>
          </div>
      </DialogSheetContent>
    </Dialog>
  );
}
