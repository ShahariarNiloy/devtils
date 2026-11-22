"use client";

import { RelatedToolsFooter } from "@/components/layout/related-tools-footer";
import { ToolShellHeader } from "@/components/layout/tool-shell-header";
import { pushRecent } from "@/components/primitives/command-palette";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ToolGuide } from "@/components/layout/tool-guides";

interface Props {
  tool: Tool;
  /** Optional sticky bottom action row (rendered inside a styled container). */
  actions?: ReactNode;
  children: ReactNode;
  /** Header title layout — see ToolShellHeader. */
  titleStyle?: "stacked" | "inline";
  /**
   * Use the window's full width (up to 1760px). Default for every tool —
   * tools are workspaces; pass `wide={false}` for a narrow, form-like tool.
   */
  wide?: boolean;
  /** Curated related tools (seoData.relatedSlugs); defaults to same category. */
  relatedSlugs?: readonly string[];
  classNames?: {
    /** e.g. "hidden md:block" for tools that draw their own mobile app bar. */
    header?: string;
    body?: string;
  };
}

/**
 * v2 per-tool page frame: header (glyph, breadcrumb, title, privacy pill),
 * the tool workspace, then related tools. Tracks the visit so the palette's
 * Recents stays useful. No entrance animation — tools are for using.
 */
export function ToolShell({ tool, actions, children, titleStyle, wide = true, relatedSlugs, classNames }: Props) {
  useEffect(() => {
    pushRecent(tool.slug);
  }, [tool.slug]);

  const [guideOpen, setGuideOpen] = useState(false);
  const [fullWindow, setFullWindow] = useState(false);
  // Stable so the memo'd header skips the tool's own re-renders.
  const openGuide = useCallback(() => setGuideOpen(true), []);
  const toggleFullWindow = useCallback(() => setFullWindow((v) => !v), []);

  // Fit-to-window sizing: publish where the workspace starts (page-relative,
  // so it holds at scroll 0) as --chrome-top. Tools size their editors with
  // calc(100dvh - var(--chrome-top) - <their own toolbar/status height>),
  // which stays right whatever the header's height or the full-window state.
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    const measure = () => {
      const scroller = fullWindow ? root.scrollTop : window.scrollY;
      const top = Math.round(body.getBoundingClientRect().top + scroller);
      root.style.setProperty("--chrome-top", `${top}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root.firstElementChild ?? root);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fullWindow]);

  // Full window: Esc exits; the page behind doesn't scroll.
  useEffect(() => {
    if (!fullWindow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog]")) setFullWindow(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullWindow]);

  return (
    <>
      <div
        ref={rootRef}
        data-full-window={fullWindow || undefined}
        className={cn(
          "mx-auto w-full px-3.5 pt-5 pb-[72px] sm:px-6 sm:pt-9 sm:pb-24",
          wide ? "max-w-[1760px]" : "max-w-[1360px]",
          // Full window: header + workspace fill the viewport; extras hide.
          fullWindow && "tool-full-window fixed inset-0 z-40 max-w-none overflow-auto bg-bg sm:px-4 sm:pt-4 sm:pb-4",
          classNames?.body,
        )}
      >
        <div className={classNames?.header}>
          <ToolShellHeader
            tool={tool}
            titleStyle={titleStyle}
            onOpenGuide={openGuide}
            fullWindow={fullWindow}
            onToggleFullWindow={toggleFullWindow}
          />
        </div>
        <div ref={bodyRef} className="flex flex-col gap-4">
          {children}
        </div>
        {!fullWindow && <RelatedToolsFooter tool={tool} slugs={relatedSlugs} />}
      </div>
      <ToolGuide tool={tool} open={guideOpen} onOpenChange={setGuideOpen} />

      {actions ? (
        <div className="surface-glass sticky bottom-0 z-20 border-t border-border-subtle">
          <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-2 px-5 py-3 sm:px-8">{actions}</div>
        </div>
      ) : null}
    </>
  );
}
