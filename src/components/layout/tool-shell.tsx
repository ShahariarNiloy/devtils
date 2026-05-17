"use client";

import { ToolShellHeader } from "@/components/layout/tool-shell-header";
import { pushRecent } from "@/components/primitives/command-palette";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

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
 * Per-tool page chrome. Top bar with breadcrumb + back link, a hero row
 * with icon chip + name + tier/availability pills, then the tool body
 * (children), an optional sticky action bar, and a related-tools strip.
 * Tracks the visit so the palette's Recents stays useful.
 */
export function ToolShell({ tool, actions, children, classNames }: Props) {
  const bodyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    pushRecent(tool.slug);
  }, [tool.slug]);

  // Open each tool at its workspace, not the header band: scroll the body
  // into view on mount so the breadcrumb/title/tags sit above the fold and
  // are revealed only if the user scrolls up. Skipped when the URL carries
  // a hash (deep link / share token) so we don't fight an explicit anchor.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) return;
    const el = bodyRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => cancelAnimationFrame(id);
  }, [tool.slug]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* ─── Tool header band ─────────────────────────── */}
        <ToolShellHeader tool={tool} classNames={classNames} />

        {/* ─── Tool body ────────────────────────────────── */}
        <section
          ref={bodyRef}
          className="bg-canvas"
          style={{ scrollMarginTop: "var(--spacing-header)" }}
        >
          <div
            className={cn(
              "mx-auto max-w-8xl px-0 sm:px-8 py-0 sm:py-8",
              classNames?.body
            )}
          >
            <div className="space-y-4">{children}</div>
          </div>
        </section>
      </motion.div>

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
