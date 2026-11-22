import Link from "next/link";
import type { PostTool } from "@/lib/blog/types";
import { cn } from "@/lib/cn";
import { TINT_TEXT } from "./tints";

interface TocEntry {
  id: string;
  v: string;
}

/** Collapsible "On this page" shown above the article below `lg`. */
export function PostTocDisclosure({ entries }: { entries: TocEntry[] }) {
  return (
    <details className="rounded-xl border border-white/[.07] bg-surface px-4 lg:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center text-sm font-bold text-text [&::-webkit-details-marker]:hidden">
        On this page
      </summary>
      <nav aria-label="On this page" className="flex flex-col pb-2.5">
        {entries.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className="flex min-h-9 items-center text-sm text-text-muted no-underline hover:text-text"
          >
            {h.v}
          </a>
        ))}
      </nav>
    </details>
  );
}

/** Sticky side rail from `lg`: TOC + the post's tool. */
export function PostTocRail({ entries, tool }: { entries: TocEntry[]; tool: PostTool }) {
  return (
    <aside className="sticky top-6 hidden max-w-[260px] flex-[1_1_240px] flex-col gap-[18px] lg:flex">
      <nav aria-labelledby="toc-label" className="flex flex-col gap-0.5">
        <span id="toc-label" className="mb-1.5 text-xs font-bold text-text-faint">
          On this page
        </span>
        {entries.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className="block border-l-2 border-white/[.08] px-2.5 py-1.5 text-[13px] leading-[1.45] text-text-tertiary transition-colors hover:text-text"
          >
            {h.v}
          </a>
        ))}
      </nav>
      <Link
        href={tool.href}
        className="flex items-center gap-2.5 rounded-xl border border-white/[.08] bg-surface p-3 text-text hover:text-text"
      >
        <ToolKey tool={tool} className="size-[34px] rounded-[9px] text-[11px]" />
        <span className="flex flex-col">
          <span className="text-[13px] font-bold">{tool.name}</span>
          <span className="text-xs text-text-faint">Runs in your browser</span>
        </span>
      </Link>
    </aside>
  );
}

/** Keycap with the tool's mono glyph, tinted by its family. */
export function ToolKey({ tool, className }: { tool: PostTool; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "surface-key flex shrink-0 items-center justify-center font-mono",
        TINT_TEXT[tool.tint],
        className,
      )}
    >
      {tool.glyph}
    </span>
  );
}
