"use client";

import { BookOpen, Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { Tooltip } from "@/components/primitives/tooltip";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { CATEGORY_TINT, TOOL_PRESENTATION, type Tint } from "@/lib/tools/presentation";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";
import { categoryAnchor } from "@/lib/tools/category-url";

const TINT_TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};

export { categoryAnchor } from "@/lib/tools/category-url";


interface ToolShellHeaderProps {
  tool: Tool;
  /**
   * `inline` puts the tagline on the h1's line (JSON formatter mockup);
   * `stacked` (default) puts it underneath (shared tool template).
   */
  titleStyle?: "stacked" | "inline";
  onOpenGuide: () => void;
  /** Whether the tool currently fills the window. */
  fullWindow: boolean;
  onToggleFullWindow: () => void;
}

/**
 * v2 tool header: keycap glyph · breadcrumb + title + tagline · "How to use"
 * and "Fit to window". The privacy guarantee lives in the nav-level copy and
 * each tool's status line rather than as a static pill here.
 */
export const ToolShellHeader = memo(function ToolShellHeader({ tool, titleStyle = "stacked", onOpenGuide, fullWindow, onToggleFullWindow }: ToolShellHeaderProps) {
  const tagline = TOOL_PRESENTATION[tool.slug]?.tagline ?? tool.description;
  const tint = TINT_TEXT[CATEGORY_TINT[tool.category]];
  const inline = titleStyle === "inline";

  return (
    <header
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 sm:mb-[18px]",
        inline ? "mb-4 sm:mb-5 sm:gap-x-[18px] sm:gap-y-3.5" : "mb-4",
      )}
    >
      <Link href="/tools" className="basis-full text-[13px] text-text-tertiary hover:text-text sm:hidden">
        ← All tools
      </Link>
      <span
        aria-hidden="true"
        className={cn(
          "surface-key flex size-10 shrink-0 items-center justify-center rounded-[11px] font-mono text-sm sm:size-11 sm:rounded-xl",
          inline && "sm:text-[15px]",
          tint,
        )}
      >
        <KeyIcon icon={toolIcon(tool.slug)} box={40} />
      </span>
      <div className={cn("flex min-w-0 flex-1 basis-0 flex-col", inline ? "sm:flex-[1_1_320px]" : "sm:flex-[1_1_260px]")}>
        <nav aria-label="Breadcrumb" className="hidden text-xs text-text-faint sm:block">
          <Link href="/tools" className="text-text-faint hover:text-text">Tools</Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <Link href={categoryAnchor(tool.category)} className="text-text-faint hover:text-text">{tool.category}</Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span aria-current="page" className="text-text-tertiary">{tool.name}</span>
        </nav>
        {inline ? (
          <>
            <h1 className="m-0 font-sans text-[22px] leading-[1.2] font-bold tracking-[-0.03em] sm:text-[26px]">
              {tool.name}{" "}
              <span className="hidden text-[17px] font-medium tracking-[-0.01em] text-text-faint sm:inline">{tagline}</span>
            </h1>
            <span className="text-[13px] text-text-faint sm:hidden">{tagline}</span>
          </>
        ) : (
          <>
            <h1 className="m-0 font-sans text-[22px] leading-[1.2] font-bold tracking-[-0.03em] sm:text-[26px]">{tool.name}</h1>
            <span className="text-sm text-text-faint">{tagline}</span>
          </>
        )}
      </div>
      {/* Own row on mobile, at the end of the title row on wider screens. */}
      <div className="flex basis-full items-center gap-2 sm:basis-auto">
        <button
          type="button"
          onClick={onOpenGuide}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-3 text-[13px] font-medium text-text-tertiary transition-colors hover:border-border-strong hover:text-text"
        >
          <BookOpen size={14} aria-hidden />
          How to use
        </button>
        <Tooltip content={fullWindow ? "Exit full window (Esc)" : "Fit the tool to the window"} side="bottom">
          <button
            type="button"
            onClick={onToggleFullWindow}
            aria-pressed={fullWindow}
            aria-label={fullWindow ? "Exit full window" : "Fit tool to window"}
            className="hidden size-9 items-center justify-center rounded-full border border-border text-text-tertiary transition-colors hover:border-border-strong hover:text-text sm:inline-flex"
          >
            {fullWindow ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
          </button>
        </Tooltip>
      </div>
    </header>
  );
});
