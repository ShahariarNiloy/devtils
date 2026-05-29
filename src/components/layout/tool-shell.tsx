"use client";

import { RelatedToolsFooter } from "@/components/layout/related-tools-footer";
import { ToolShellHeader } from "@/components/layout/tool-shell-header";
import { pushRecent } from "@/components/primitives/command-palette";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { useEffect, type ReactNode } from "react";

interface Props {
  tool: Tool;
  /** Optional sticky bottom action row (rendered inside a styled container). */
  actions?: ReactNode;
  children: ReactNode;
  classNames?: {
    header?: string;
    body?: string;
  };
}

/**
 * Per-tool page chrome. Breadcrumb + title strip at the top, the tool
 * workspace below it, an optional sticky action bar, and a related-tools
 * footer. Tracks the visit so the palette's Recents stays useful.
 *
 * No entrance animation. Tools are utilitarian — visitors come to USE
 * them, not watch them fade in. Skipping the framer-motion wrapper also
 * eliminates the SSR-content-at-`opacity:0` problem (relevant for crawlers
 * and failed-hydration paths) and removes a ~200ms gate on the workspace
 * being interactable. If a marketing reveal is ever wanted somewhere, it
 * belongs on the homepage, not here.
 */
export function ToolShell({ tool, actions, children, classNames }: Props) {
  useEffect(() => {
    pushRecent(tool.slug);
  }, [tool.slug]);

  return (
    <>
      <div>
        {/* ─── Tool header band ─────────────────────────── */}
        <ToolShellHeader tool={tool} classNames={classNames} />

        {/* ─── Tool body ────────────────────────────────── */}
        <section
          className="bg-canvas min-h-dvh"
          style={{ scrollMarginTop: "var(--spacing-header)" }}
        >
          <div
            className={cn(
              "mx-auto max-w-8xl px-0 sm:px-8 py-0 sm:py-8",
              classNames?.body,
            )}
          >
            <div className="space-y-4">{children}</div>
          </div>
        </section>

        {/* ─── Related tools footer ─────────────────────── */}
        <RelatedToolsFooter tool={tool} />
      </div>

      {/* ─── Sticky action bar ──────────────────────────── */}
      {actions ? (
        <div
          className="sticky bottom-0 z-20 border-t border-border-subtle"
          style={{
            background: "color-mix(in oklab, var(--color-bg) 92%, transparent)",
            backdropFilter: "saturate(140%) blur(10px)",
          }}
        >
          <div className="mx-auto max-w-8xl px-5 sm:px-8 py-3 flex flex-wrap items-center gap-2">
            {actions}
          </div>
        </div>
      ) : null}
    </>
  );
}
