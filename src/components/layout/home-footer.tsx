import { SITE_NAME } from "@/lib/site";
import Link from "next/link";
import { BrandMark } from "./brand/brand-mark";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Categories",
    links: [
      { href: "/tools/category/json", label: "JSON" },
      { href: "/tools/category/text", label: "Text" },
      { href: "/tools/category/encoding", label: "Encoding" },
      { href: "/tools/category", label: "All categories" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/tools", label: "All tools" },
      { href: "/blog", label: "Blog" },
      { href: "/changelog", label: "Changelog" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

/**
 * v2 site footer — shared by every page. `compact` is the single-row
 * variant used inside app-like pages (catalogue, tools).
 */
export function HomeFooter({ variant = "full", wide = false }: { variant?: "full" | "compact"; wide?: boolean }) {
  if (variant === "compact") {
    return (
      <footer className="border-t border-border-subtle">
        <div className={`mx-auto flex ${wide ? "max-w-[1360px]" : "max-w-[1160px]"} flex-wrap gap-x-6 gap-y-2.5 px-6 pt-[22px] pb-[30px] text-[13px] text-text-faint`}>
          <span className="grow">
            © {new Date().getFullYear()} {SITE_NAME} · made with care
          </span>
          {[
            { href: "/blog", label: "Blog" },
            { href: "/request", label: "Request a tool" },
            { href: "/changelog", label: "What's new" },
            { href: "/faq", label: "FAQ" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/contact", label: "Contact" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-text-tertiary hover:text-text">
              {l.label}
            </Link>
          ))}
        </div>
      </footer>
    );
  }
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-8 px-6 pt-12 pb-8 text-sm">
        <div className="flex flex-col gap-2.5 sm:col-span-2">
          <Link href="/" aria-label="utilyx — home" className="self-start text-text hover:text-text">
            <BrandMark />
          </Link>
          <p className="m-0 max-w-[280px] text-text-faint">Private, fast, free developer tools. Built quietly.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2">
            <span className="mb-1 text-xs text-text-faint">{col.title}</span>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-text-muted transition-colors hover:text-text">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1100px] flex-wrap gap-2.5 border-t border-white/[.05] px-6 pt-[18px] pb-7 text-[13px] text-text-faint">
        <span className="grow">
          © {new Date().getFullYear()} {SITE_NAME} · made with care
        </span>
        <span className="font-mono">100% client-side</span>
      </div>
    </footer>
  );
}
